import { GRAPH_API } from './meta-config'

export interface MetaTokenInfo {
  userName: string
  businessId: string | null
  businessName: string | null
  adAccountIds: string[]
}

export async function fetchMetaTokenInfo(token: string): Promise<MetaTokenInfo> {
  const headers = { Authorization: `Bearer ${token}` }

  const meRes = await fetch(`${GRAPH_API}/me?fields=id,name`, { headers, signal: AbortSignal.timeout(8000) })
  const me = await meRes.json()

  if (me.error) {
    throw new Error(me.error.message ?? 'Token inválido')
  }

  const [adAccountsRes, businessesRes] = await Promise.all([
    fetch(`${GRAPH_API}/me/adaccounts?fields=id&limit=50`, { headers, signal: AbortSignal.timeout(8000) }),
    fetch(`${GRAPH_API}/me/businesses?fields=id,name&limit=10`, { headers, signal: AbortSignal.timeout(8000) }),
  ])

  if (!adAccountsRes.ok) throw new Error(`Erro ao buscar contas de anúncio: ${adAccountsRes.status}`)
  if (!businessesRes.ok) throw new Error(`Erro ao buscar Business Managers: ${businessesRes.status}`)

  const adAccountsData = await adAccountsRes.json()
  const businessesData = await businessesRes.json()

  const adAccountIds: string[] = (adAccountsData.data ?? []).map(
    (a: { id: string }) => a.id
  )
  const businesses: { id: string; name: string }[] = businessesData.data ?? []

  return {
    userName: me.name as string,
    businessId: businesses[0]?.id ?? null,
    businessName: businesses[0]?.name ?? null,
    adAccountIds,
  }
}
