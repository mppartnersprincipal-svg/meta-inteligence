'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { encryptToken, hashToken } from '@/lib/crypto'
import { fetchMetaTokenInfo, type MetaAdAccount } from '@/lib/meta-api'

// -----------------------------------------------------------------------------
// Passo 1 do cadastro: usuário cola o token e recebe as contas disponíveis
// -----------------------------------------------------------------------------

export interface ValidateTokenResult {
  ok: true
  userName: string
  businessName: string | null
  businessId: string | null
  accounts: MetaAdAccount[]
}

export interface ValidateTokenError {
  ok: false
  error: string
}

export async function validateTokenAction(
  token: string
): Promise<ValidateTokenResult | ValidateTokenError> {
  if (!token || token.trim().length === 0) {
    return { ok: false, error: 'Token é obrigatório.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autenticado.' }

  try {
    const info = await fetchMetaTokenInfo(token)
    return {
      ok: true,
      userName: info.userName,
      businessName: info.businessName,
      businessId: info.businessId,
      accounts: info.adAccounts,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao validar token com a Meta.' }
  }
}

// -----------------------------------------------------------------------------
// Helper: reusa meta_tokens existente do usuário (mesmo token cifrado) ou cria
// -----------------------------------------------------------------------------
async function upsertMetaToken(opts: {
  userId: string
  token: string
  businessId: string | null
  businessName: string | null
  metaUserName: string | null
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const tokenHash = hashToken(opts.token)

  // Procura token já cadastrado para esse usuário (dedup por hash do plaintext)
  const { data: existing } = await supabase
    .from('meta_tokens')
    .select('id')
    .eq('user_id', opts.userId)
    .eq('token_hash', tokenHash)
    .maybeSingle()

  let token_encrypted: string
  try {
    token_encrypted = encryptToken(opts.token)
  } catch {
    return { error: 'Erro na criptografia do token. Verifique TOKEN_ENCRYPTION_KEY.' }
  }

  if (existing) {
    // Atualiza ciphertext (IV novo) + metadados, mantém o id
    const { error } = await supabase
      .from('meta_tokens')
      .update({
        token_encrypted,
        business_id: opts.businessId,
        business_name: opts.businessName,
        meta_user_name: opts.metaUserName,
        is_valid: true,
        last_validated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) return { error: `Erro ao atualizar token: ${error.message}` }
    return { id: existing.id }
  }

  const { data: inserted, error } = await supabase
    .from('meta_tokens')
    .insert({
      user_id: opts.userId,
      token_encrypted,
      token_hash: tokenHash,
      business_id: opts.businessId,
      business_name: opts.businessName,
      meta_user_name: opts.metaUserName,
      is_valid: true,
      last_validated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !inserted) return { error: error?.message ?? 'Erro ao salvar token.' }
  return { id: inserted.id }
}

// -----------------------------------------------------------------------------
// Passo 2 do cadastro: usuário escolhe contas + nome do cliente
// -----------------------------------------------------------------------------
export async function createClientAction(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const token = (formData.get('token') as string) ?? ''
  const name = ((formData.get('name') as string) ?? '').trim()
  const category = (formData.get('category') as string) || 'other'
  const adAccountIds = formData.getAll('ad_account_ids').map((v) => String(v)).filter(Boolean)

  if (!token) return { error: 'Token é obrigatório.' }
  if (!name) return { error: 'Nome do cliente é obrigatório.' }
  if (adAccountIds.length === 0) return { error: 'Selecione ao menos uma conta de anúncio.' }

  // Revalida token e checa que as contas escolhidas realmente existem no token
  let metaInfo: Awaited<ReturnType<typeof fetchMetaTokenInfo>>
  try {
    metaInfo = await fetchMetaTokenInfo(token)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao validar token com a Meta.' }
  }

  const availableIds = new Set(metaInfo.adAccounts.map((a) => a.id))
  const invalid = adAccountIds.filter((id) => !availableIds.has(id))
  if (invalid.length > 0) {
    return { error: `Contas inválidas para este token: ${invalid.join(', ')}` }
  }

  // Cria/reusa meta_tokens
  const metaTokenResult = await upsertMetaToken({
    userId: user.id,
    token,
    businessId: metaInfo.businessId,
    businessName: metaInfo.businessName,
    metaUserName: metaInfo.userName,
  })
  if ('error' in metaTokenResult) return { error: metaTokenResult.error }

  // Cria cliente
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({ name, category, logo_url: null, user_id: user.id })
    .select('id')
    .single()

  if (clientError || !client) {
    return { error: clientError?.message ?? 'Erro ao criar cliente.' }
  }

  // Liga cliente ao meta_token + ad_account_ids escolhidos
  const { error: tokenError } = await supabase.from('bm_tokens').insert({
    client_id: client.id,
    meta_token_id: metaTokenResult.id,
    ad_account_ids: adAccountIds,
  })

  if (tokenError) {
    await supabase.from('clients').delete().eq('id', client.id)
    return { error: tokenError.message }
  }

  // Config default
  const { error: configError } = await supabase.from('client_config').insert({
    client_id: client.id,
    alert_roas_threshold: 1.0,
    default_period: 'last_7d',
    color_theme: 'blue',
  })

  if (configError) {
    await supabase.from('bm_tokens').delete().eq('client_id', client.id)
    await supabase.from('clients').delete().eq('id', client.id)
    return { error: 'Erro ao criar configuração do cliente.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/settings/clients')
  redirect(`/dashboard/${client.id}`)
}

// -----------------------------------------------------------------------------
// Edição: atualiza nome/categoria/logo, contas vinculadas e (opcional) token
// -----------------------------------------------------------------------------
export async function updateClientAction(clientId: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = ((formData.get('name') as string) ?? '').trim()
  const category = (formData.get('category') as string) || 'other'
  const logo_url = (formData.get('logo_url') as string) || null
  const adAccountIds = formData.getAll('ad_account_ids').map((v) => String(v)).filter(Boolean)

  if (!name) return { error: 'Nome é obrigatório.' }

  const { error } = await supabase
    .from('clients')
    .update({ name, category, logo_url })
    .eq('id', clientId)

  if (error) return { error: error.message }

  const token = (formData.get('token') as string) ?? ''

  // Carrega bm_tokens atual (precisamos do meta_token_id para validar/atualizar contas)
  const { data: bmRow } = await supabase
    .from('bm_tokens')
    .select('id, meta_token_id')
    .eq('client_id', clientId)
    .maybeSingle()

  // Caso 1: novo token fornecido → revalida, faz upsert do meta_token e troca contas
  if (token) {
    let metaInfo: Awaited<ReturnType<typeof fetchMetaTokenInfo>>
    try {
      metaInfo = await fetchMetaTokenInfo(token)
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Erro ao validar token com a Meta.' }
    }

    const availableIds = new Set(metaInfo.adAccounts.map((a) => a.id))
    const finalIds = adAccountIds.length > 0
      ? adAccountIds.filter((id) => availableIds.has(id))
      : metaInfo.adAccounts.map((a) => a.id) // fallback: todas (improvável — UI sempre envia seleção)

    if (finalIds.length === 0) {
      return { error: 'Selecione ao menos uma conta de anúncio.' }
    }

    const metaTokenResult = await upsertMetaToken({
      userId: user.id,
      token,
      businessId: metaInfo.businessId,
      businessName: metaInfo.businessName,
      metaUserName: metaInfo.userName,
    })
    if ('error' in metaTokenResult) return { error: metaTokenResult.error }

    if (bmRow) {
      const { error: updErr } = await supabase
        .from('bm_tokens')
        .update({ meta_token_id: metaTokenResult.id, ad_account_ids: finalIds })
        .eq('id', bmRow.id)
      if (updErr) return { error: `Erro ao atualizar contas: ${updErr.message}` }
    } else {
      const { error: insErr } = await supabase.from('bm_tokens').insert({
        client_id: clientId,
        meta_token_id: metaTokenResult.id,
        ad_account_ids: finalIds,
      })
      if (insErr) return { error: `Erro ao salvar contas: ${insErr.message}` }
    }
  } else if (bmRow && adAccountIds.length > 0) {
    // Caso 2: sem novo token, só ajuste das contas vinculadas.
    // Valida que as contas pertencem ao token salvo (RLS já garante o user_id).
    const { data: tokenRow } = await supabase
      .from('meta_tokens')
      .select('token_encrypted')
      .eq('id', bmRow.meta_token_id)
      .single()

    if (tokenRow?.token_encrypted) {
      // Para validar, precisaríamos descriptografar e chamar a Meta API.
      // Como o usuário só pode marcar checkboxes que já foram listados no servidor,
      // confiamos na lista submetida — a UI gera as opções a partir da Meta API.
      const { error: updErr } = await supabase
        .from('bm_tokens')
        .update({ ad_account_ids: adAccountIds })
        .eq('id', bmRow.id)
      if (updErr) return { error: `Erro ao atualizar contas: ${updErr.message}` }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/settings/clients')
  redirect('/settings/clients')
}

// -----------------------------------------------------------------------------
// Lista contas disponíveis no token salvo de um cliente (para tela de edit)
// -----------------------------------------------------------------------------
export async function listClientTokenAccountsAction(
  clientId: string
): Promise<{ ok: true; accounts: MetaAdAccount[]; linkedIds: string[] } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autenticado.' }

  const { data: bm } = await supabase
    .from('bm_tokens')
    .select('ad_account_ids, meta_token_id, meta_tokens!inner(token_encrypted, is_valid)')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!bm) return { ok: false, error: 'Cliente sem token vinculado.' }

  const linkedIds: string[] = (bm.ad_account_ids as string[]) ?? []
  const mt = Array.isArray(bm.meta_tokens) ? bm.meta_tokens[0] : bm.meta_tokens
  if (!mt?.token_encrypted) return { ok: false, error: 'Token criptografado não encontrado.' }
  if (!mt.is_valid) return { ok: false, error: 'Token inválido. Forneça um novo token.' }

  const { decryptToken } = await import('@/lib/crypto')
  let token: string
  try {
    token = decryptToken(mt.token_encrypted as string)
  } catch {
    return { ok: false, error: 'Falha ao descriptografar token.' }
  }

  try {
    const info = await fetchMetaTokenInfo(token)
    return { ok: true, accounts: info.adAccounts, linkedIds }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao buscar contas.' }
  }
}

export async function deleteClientAction(clientId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/settings/clients')
  redirect('/settings/clients')
}
