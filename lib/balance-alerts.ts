import { createClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'
import { fetchAccountInfo, type AccountInfo } from '@/lib/meta-insights'

// Threshold fixo: R$ 200,00. Convertido para minor units (centavos) na hora da comparação.
export const BALANCE_THRESHOLD_BRL = 200
export const BALANCE_THRESHOLD_BRL_MINOR = BALANCE_THRESHOLD_BRL * 100

export interface BalanceAlertRow {
  id: string
  client_id: string
  account_id: string
  account_name: string
  balance_minor_units: number
  currency: string
  threshold_minor_units: number
  status: 'unread' | 'dismissed' | 'resolved'
  created_at: string
  dismissed_at: string | null
}

export interface BalanceAlertWithClient extends BalanceAlertRow {
  client_name: string
}

// Só alertamos contas em BRL — threshold é em reais.
function shouldAlert(info: AccountInfo): boolean {
  if (info.currency !== 'BRL') return false
  if (info.balance <= 0) return false
  return info.balance < BALANCE_THRESHOLD_BRL_MINOR
}

/**
 * Verifica saldos de um cliente e sincroniza com a tabela de alertas:
 *  - cria alerta `unread` se conta caiu abaixo do threshold e não há alerta ativo
 *  - marca alerta ativo como `resolved` se conta voltou acima do threshold
 *
 * Idempotente — pode ser chamado a cada page load sem duplicar.
 */
export async function syncBalanceAlertsForClient(
  clientId: string,
  accounts: AccountInfo[]
): Promise<void> {
  if (accounts.length === 0) return

  const supabase = await createClient()

  const { data: existingAlerts } = await supabase
    .from('account_balance_alerts')
    .select('id, account_id')
    .eq('client_id', clientId)
    .eq('status', 'unread')

  const existingByAccount = new Map<string, string>(
    (existingAlerts ?? []).map((a) => [a.account_id as string, a.id as string])
  )

  const inserts: Array<{
    client_id: string
    account_id: string
    account_name: string
    balance_minor_units: number
    currency: string
    threshold_minor_units: number
  }> = []
  const resolveIds: string[] = []

  for (const info of accounts) {
    const below = shouldAlert(info)
    const existingId = existingByAccount.get(info.id)

    if (below && !existingId) {
      inserts.push({
        client_id: clientId,
        account_id: info.id,
        account_name: info.name,
        balance_minor_units: info.balance,
        currency: info.currency,
        threshold_minor_units: BALANCE_THRESHOLD_BRL_MINOR,
      })
    } else if (!below && existingId) {
      resolveIds.push(existingId)
    }
  }

  await Promise.all([
    inserts.length > 0
      ? supabase.from('account_balance_alerts').insert(inserts)
      : Promise.resolve(),
    resolveIds.length > 0
      ? supabase
          .from('account_balance_alerts')
          .update({ status: 'resolved', dismissed_at: new Date().toISOString() })
          .in('id', resolveIds)
      : Promise.resolve(),
  ])
}

/**
 * Sincroniza alertas de saldo para TODOS os clientes do usuário logado.
 * Roda no app layout, então funciona em qualquer página (não só dashboards).
 * fetchAccountInfo tem cache de 5min — chamadas repetidas não vão pra Meta API.
 */
export async function syncBalanceAlertsForAllClients(): Promise<void> {
  const supabase = await createClient()

  // RLS limita aos clientes do usuário logado.
  const { data: tokens } = await supabase
    .from('bm_tokens')
    .select('client_id, token_encrypted, ad_account_ids, is_valid')
    .eq('is_valid', true)

  if (!tokens || tokens.length === 0) return

  await Promise.all(
    tokens.map(async (row) => {
      const clientId = row.client_id as string
      const encrypted = row.token_encrypted as string
      const accountIds = (row.ad_account_ids as string[]) ?? []
      if (accountIds.length === 0) return

      let token: string
      try {
        token = decryptToken(encrypted)
      } catch {
        return
      }

      const accounts = await Promise.all(
        accountIds.map((id) =>
          fetchAccountInfo(id, token).catch(
            () => ({ id, name: id, balance: 0, amountSpent: 0, currency: 'BRL' } satisfies AccountInfo)
          )
        )
      )

      await syncBalanceAlertsForClient(clientId, accounts).catch(() => {})
    })
  )
}

/**
 * Lista alertas unread do usuário logado, com o nome do cliente já anexado.
 * RLS limita a leitura aos clientes do usuário.
 */
export async function listUnreadAlerts(): Promise<BalanceAlertWithClient[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('account_balance_alerts')
    .select('id, client_id, account_id, account_name, balance_minor_units, currency, threshold_minor_units, status, created_at, dismissed_at, clients(name)')
    .eq('status', 'unread')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []

  return data.map((row) => {
    const client = row.clients as { name?: string } | { name?: string }[] | null
    const clientName = Array.isArray(client)
      ? client[0]?.name ?? ''
      : client?.name ?? ''
    return {
      id: row.id as string,
      client_id: row.client_id as string,
      account_id: row.account_id as string,
      account_name: row.account_name as string,
      balance_minor_units: row.balance_minor_units as number,
      currency: row.currency as string,
      threshold_minor_units: row.threshold_minor_units as number,
      status: row.status as 'unread' | 'dismissed' | 'resolved',
      created_at: row.created_at as string,
      dismissed_at: row.dismissed_at as string | null,
      client_name: clientName,
    }
  })
}
