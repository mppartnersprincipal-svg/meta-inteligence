import { GRAPH_API } from './meta-config'

export interface MetaAdAccount {
  id: string
  name: string
  accountStatus: number
  businessName: string | null
  currency: string | null
}

export interface MetaTokenInfo {
  userName: string
  businessId: string | null
  businessName: string | null
  adAccounts: MetaAdAccount[]
}

export async function fetchMetaTokenInfo(token: string): Promise<MetaTokenInfo> {
  const headers = { Authorization: `Bearer ${token}` }

  const meRes = await fetch(`${GRAPH_API}/me?fields=id,name`, { headers, signal: AbortSignal.timeout(8000) })
  if (!meRes.ok) throw new Error(`Meta API error ${meRes.status} ao validar token`)
  const me = await meRes.json() as { id?: string; name?: string; error?: { message?: string } }

  if (me.error) {
    throw new Error(me.error.message ?? 'Token inválido')
  }

  const adAccountFields = 'id,name,account_status,currency,business{id,name}'

  const [adAccountsRes, businessesRes] = await Promise.all([
    fetch(`${GRAPH_API}/me/adaccounts?fields=${adAccountFields}&limit=200`, { headers, signal: AbortSignal.timeout(8000) }),
    fetch(`${GRAPH_API}/me/businesses?fields=id,name&limit=10`, { headers, signal: AbortSignal.timeout(8000) }),
  ])

  if (!adAccountsRes.ok) throw new Error(`Erro ao buscar contas de anúncio: ${adAccountsRes.status}`)
  if (!businessesRes.ok) throw new Error(`Erro ao buscar Business Managers: ${businessesRes.status}`)

  interface RawAdAccount {
    id: string
    name?: string
    account_status?: number
    currency?: string
    business?: { id?: string; name?: string }
  }

  const adAccountsData = await adAccountsRes.json() as {
    data?: RawAdAccount[]
    paging?: { cursors?: { after?: string }; next?: string }
  }
  const businessesData = await businessesRes.json() as { data?: { id: string; name: string }[] }

  const mapRaw = (a: RawAdAccount): MetaAdAccount => ({
    id: a.id,
    name: a.name ?? a.id,
    accountStatus: a.account_status ?? 0,
    businessName: a.business?.name ?? null,
    currency: a.currency ?? null,
  })

  const adAccounts: MetaAdAccount[] = (adAccountsData.data ?? []).map(mapRaw)

  let nextUrl = adAccountsData.paging?.next
  let safetyLimit = 10 // max 10 extra pages (~2200 contas)
  while (nextUrl && safetyLimit-- > 0) {
    const pageRes = await fetch(nextUrl, { headers, signal: AbortSignal.timeout(8000) })
    if (!pageRes.ok) break
    const page = await pageRes.json() as {
      data?: RawAdAccount[]
      paging?: { next?: string }
    }
    adAccounts.push(...(page.data ?? []).map(mapRaw))
    nextUrl = page.paging?.next
  }

  const businesses: { id: string; name: string }[] = businessesData.data ?? []

  return {
    userName: me.name as string,
    businessId: businesses[0]?.id ?? null,
    businessName: businesses[0]?.name ?? null,
    adAccounts,
  }
}
