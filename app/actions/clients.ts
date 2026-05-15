'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/crypto'
import { fetchMetaTokenInfo } from '@/lib/meta-api'

export async function createClientAction(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const token = formData.get('token') as string
  const category = (formData.get('category') as string) || 'other'

  if (!token) return { error: 'Token é obrigatório.' }

  // Fetch everything from Meta API — no manual input needed
  let metaInfo: Awaited<ReturnType<typeof fetchMetaTokenInfo>>
  try {
    metaInfo = await fetchMetaTokenInfo(token)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao validar token com a Meta.' }
  }

  const name = metaInfo.businessName ?? metaInfo.userName
  const bm_id = metaInfo.businessId ?? 'personal'
  const ad_account_ids = metaInfo.adAccountIds

  // Insert client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({ name, category, logo_url: null, user_id: user.id })
    .select('id')
    .single()

  if (clientError || !client) {
    return { error: clientError?.message ?? 'Erro ao criar cliente.' }
  }

  // Encrypt token server-side — plaintext never stored
  let token_encrypted: string
  try {
    token_encrypted = encryptToken(token)
  } catch {
    await supabase.from('clients').delete().eq('id', client.id)
    return { error: 'Erro na criptografia do token. Verifique TOKEN_ENCRYPTION_KEY.' }
  }

  // Insert encrypted token with validation status
  const { error: tokenError } = await supabase.from('bm_tokens').insert({
    client_id: client.id,
    bm_id,
    token_encrypted,
    ad_account_ids,
    is_valid: true,
    last_validated_at: new Date().toISOString(),
  })

  if (tokenError) {
    await supabase.from('clients').delete().eq('id', client.id)
    return { error: tokenError.message }
  }

  // Default config
  await supabase.from('client_config').insert({
    client_id: client.id,
    alert_roas_threshold: 1.0,
    default_period: 'last_7d',
    color_theme: 'blue',
  })

  revalidatePath('/dashboard')
  revalidatePath('/settings/clients')
  redirect(`/dashboard/${client.id}`)
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const logo_url = (formData.get('logo_url') as string) || null

  if (!name) return { error: 'Nome é obrigatório.' }

  const { error } = await supabase
    .from('clients')
    .update({ name, category, logo_url })
    .eq('id', clientId)

  if (error) return { error: error.message }

  // If a new token is provided, re-sync BM ID and ad accounts from Meta API
  const token = formData.get('token') as string

  if (token) {
    let metaInfo: Awaited<ReturnType<typeof fetchMetaTokenInfo>>
    try {
      metaInfo = await fetchMetaTokenInfo(token)
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Erro ao validar token com a Meta.' }
    }

    const bm_id = metaInfo.businessId ?? 'personal'
    const ad_account_ids = metaInfo.adAccountIds

    let token_encrypted: string
    try {
      token_encrypted = encryptToken(token)
    } catch {
      return { error: 'Erro na criptografia do token.' }
    }

    const { data: existing } = await supabase
      .from('bm_tokens')
      .select('id')
      .eq('client_id', clientId)
      .single()

    if (existing) {
      await supabase
        .from('bm_tokens')
        .update({
          bm_id,
          token_encrypted,
          ad_account_ids,
          is_valid: true,
          last_validated_at: new Date().toISOString(),
        })
        .eq('client_id', clientId)
    } else {
      await supabase.from('bm_tokens').insert({
        client_id: clientId,
        bm_id,
        token_encrypted,
        ad_account_ids,
        is_valid: true,
        last_validated_at: new Date().toISOString(),
      })
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/settings/clients')
  redirect('/settings/clients')
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
