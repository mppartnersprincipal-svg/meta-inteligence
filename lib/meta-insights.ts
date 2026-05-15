import { GRAPH_API } from './meta-config'

export interface KPIs {
  // Alcance & Investimento
  spend: number
  reach: number
  impressions: number
  frequency: number
  cpm: number

  // Cliques & Tráfego
  clicks: number
  linkClicks: number
  linkCtr: number
  cpc: number

  // Resultados
  leads: number
  costPerLead: number
  messages: number
  costPerMessage: number

  // Engajamento
  postEngagements: number
  reactions: number
  comments: number
  shares: number
}

export interface DailySpend {
  date: string
  spend: number
}

export interface CampaignRow {
  id: string
  name: string
  status: string
  spend: number
  clicks: number
  leads: number
  messages: number
}

export interface AccountInfo {
  id: string
  name: string
}

export interface AdRow {
  adId: string
  adName: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  leads: number
  messages: number
}

// ── Meta API response types ─────────────────────────────────────────────────

interface MetaAction {
  action_type: string
  value: string
}

interface MetaInsightEntry {
  spend?: string
  reach?: string
  impressions?: string
  clicks?: string
  inline_link_clicks?: string
  date_start?: string
  campaign_id?: string
  campaign_name?: string
  ad_id?: string
  ad_name?: string
  actions?: MetaAction[]
}

interface MetaInsightResponse {
  data?: MetaInsightEntry[]
  error?: { message: string }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function insightsRequest(
  accountId: string,
  token: string,
  params: Record<string, string>
): Promise<MetaInsightResponse> {
  const url = new URL(`${GRAPH_API}/${accountId}/insights`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`Meta API error ${res.status} for ${accountId}`)
  return res.json() as Promise<MetaInsightResponse>
}

function getAction(actions: MetaAction[] | undefined, type: string): number {
  return parseFloat(actions?.find((a) => a.action_type === type)?.value ?? '0')
}

function aggregateKPIs(results: (MetaInsightResponse | null)[]): KPIs {
  let spend = 0
  let reach = 0
  let impressions = 0
  let clicks = 0
  let linkClicks = 0
  let leads = 0
  let messages = 0
  let postEngagements = 0
  let reactions = 0
  let comments = 0
  let shares = 0

  for (const r of results) {
    const d = r?.data?.[0]
    if (!d) continue

    spend += parseFloat(d.spend ?? '0')
    reach += parseInt(d.reach ?? '0')
    impressions += parseInt(d.impressions ?? '0')
    clicks += parseInt(d.clicks ?? '0')
    linkClicks += parseInt(d.inline_link_clicks ?? '0')

    leads += getAction(d.actions, 'lead')
    messages += getAction(d.actions, 'onsite_conversion.messaging_conversation_started_7d')
    postEngagements += getAction(d.actions, 'post_engagement')
    reactions += getAction(d.actions, 'post_reaction')
    comments += getAction(d.actions, 'comment')
    shares += getAction(d.actions, 'post')
  }

  return {
    spend,
    reach,
    impressions,
    frequency: reach > 0 ? impressions / reach : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    clicks,
    linkClicks,
    linkCtr: impressions > 0 ? (linkClicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    leads,
    costPerLead: leads > 0 ? spend / leads : 0,
    messages,
    costPerMessage: messages > 0 ? spend / messages : 0,
    postEngagements,
    reactions,
    comments,
    shares,
  }
}

// ── Multi-account (client overview) ────────────────────────────────────────

export async function fetchKPIs(
  accountIds: string[],
  token: string,
  datePreset = 'last_7d'
): Promise<KPIs> {
  const results = await Promise.all(
    accountIds.map((id) =>
      insightsRequest(id, token, {
        fields: 'spend,reach,impressions,clicks,inline_link_clicks,actions',
        date_preset: datePreset,
      }).catch(() => null)
    )
  )
  return aggregateKPIs(results)
}

export async function fetchDailySpend(
  accountIds: string[],
  token: string,
  datePreset = 'last_30d'
): Promise<DailySpend[]> {
  const results = await Promise.all(
    accountIds.map((id) =>
      insightsRequest(id, token, {
        fields: 'spend,date_start',
        date_preset: datePreset,
        time_increment: '1',
      }).catch(() => null)
    )
  )

  const map: Record<string, number> = {}
  for (const r of results) {
    for (const d of r?.data ?? []) {
      if (!d.date_start) continue
      map[d.date_start] = (map[d.date_start] ?? 0) + parseFloat(d.spend ?? '0')
    }
  }

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, spend]) => ({ date, spend }))
}

export async function fetchCampaigns(
  accountIds: string[],
  token: string,
  datePreset = 'last_7d'
): Promise<CampaignRow[]> {
  const results = await Promise.all(
    accountIds.map((id) =>
      insightsRequest(id, token, {
        fields: 'campaign_id,campaign_name,spend,clicks,actions',
        date_preset: datePreset,
        level: 'campaign',
      }).catch(() => null)
    )
  )

  const rows: CampaignRow[] = []
  for (const r of results) {
    for (const d of r?.data ?? []) {
      rows.push({
        id: d.campaign_id ?? '',
        name: d.campaign_name ?? '',
        status: 'ACTIVE',
        spend: parseFloat(d.spend ?? '0'),
        clicks: parseInt(d.clicks ?? '0'),
        leads: getAction(d.actions, 'lead'),
        messages: getAction(d.actions, 'onsite_conversion.messaging_conversation_started_7d'),
      })
    }
  }

  return rows.sort((a, b) => b.spend - a.spend).slice(0, 10)
}

// ── Single account ──────────────────────────────────────────────────────────

export async function fetchAccountInfo(
  accountId: string,
  token: string
): Promise<AccountInfo> {
  const url = new URL(`${GRAPH_API}/${accountId}`)
  url.searchParams.set('fields', 'id,name')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  })
  const data = await res.json() as { id?: string; name?: string; error?: { message: string } }
  if (data.error) throw new Error(data.error.message)
  return { id: data.id ?? accountId, name: data.name ?? accountId }
}

export async function fetchAccountKPIs(
  accountId: string,
  token: string,
  datePreset = 'last_7d'
): Promise<KPIs> {
  const result = await insightsRequest(accountId, token, {
    fields: 'spend,reach,impressions,clicks,inline_link_clicks,actions',
    date_preset: datePreset,
  }).catch(() => null)
  return aggregateKPIs([result])
}

export async function fetchAccountDailySpend(
  accountId: string,
  token: string,
  datePreset = 'last_30d'
): Promise<DailySpend[]> {
  const result = await insightsRequest(accountId, token, {
    fields: 'spend,date_start',
    date_preset: datePreset,
    time_increment: '1',
  }).catch(() => null)

  return (result?.data ?? [])
    .filter((d) => d.date_start !== undefined)
    .map((d) => ({ date: d.date_start!, spend: parseFloat(d.spend ?? '0') }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchAccountCampaigns(
  accountId: string,
  token: string,
  datePreset = 'last_7d'
): Promise<CampaignRow[]> {
  const result = await insightsRequest(accountId, token, {
    fields: 'campaign_id,campaign_name,spend,clicks,actions',
    date_preset: datePreset,
    level: 'campaign',
  }).catch(() => null)

  const rows: CampaignRow[] = []
  for (const d of result?.data ?? []) {
    rows.push({
      id: d.campaign_id ?? '',
      name: d.campaign_name ?? '',
      status: 'ACTIVE',
      spend: parseFloat(d.spend ?? '0'),
      clicks: parseInt(d.clicks ?? '0'),
      leads: getAction(d.actions, 'lead'),
      messages: getAction(d.actions, 'onsite_conversion.messaging_conversation_started_7d'),
    })
  }

  return rows.sort((a, b) => b.spend - a.spend).slice(0, 20)
}

// ── Campaign detail ─────────────────────────────────────────────────────────

export async function fetchCampaignKPIs(
  campaignId: string,
  accountId: string,
  token: string,
  datePreset = 'last_7d'
): Promise<KPIs> {
  const result = await insightsRequest(accountId, token, {
    fields: 'spend,reach,impressions,clicks,inline_link_clicks,actions',
    date_preset: datePreset,
    level: 'campaign',
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: [campaignId] }]),
  }).catch(() => null)
  return aggregateKPIs([result])
}

export async function fetchCampaignDailySpend(
  campaignId: string,
  accountId: string,
  token: string,
  datePreset = 'last_30d'
): Promise<DailySpend[]> {
  const result = await insightsRequest(accountId, token, {
    fields: 'spend,date_start',
    date_preset: datePreset,
    time_increment: '1',
    level: 'campaign',
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: [campaignId] }]),
  }).catch(() => null)

  return (result?.data ?? [])
    .filter((d) => d.date_start !== undefined)
    .map((d) => ({ date: d.date_start!, spend: parseFloat(d.spend ?? '0') }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchCampaignAds(
  campaignId: string,
  accountId: string,
  token: string,
  datePreset = 'last_7d'
): Promise<AdRow[]> {
  const result = await insightsRequest(accountId, token, {
    fields: 'ad_id,ad_name,spend,impressions,clicks,actions',
    date_preset: datePreset,
    level: 'ad',
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: [campaignId] }]),
  }).catch(() => null)

  const rows: AdRow[] = []
  for (const d of result?.data ?? []) {
    const spend = parseFloat(d.spend ?? '0')
    const impressions = parseInt(d.impressions ?? '0')
    const clicks = parseInt(d.clicks ?? '0')
    rows.push({
      adId: d.ad_id ?? '',
      adName: d.ad_name ?? 'Sem nome',
      spend,
      impressions,
      clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      leads: getAction(d.actions, 'lead'),
      messages: getAction(d.actions, 'onsite_conversion.messaging_conversation_started_7d'),
    })
  }

  return rows.sort((a, b) => b.spend - a.spend)
}
