import { cache } from 'react'
import { GRAPH_API } from './meta-config'
import type { DatePreset } from './dashboard-params'

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
  // Meta retorna balance/amount_spent em unidades menores (centavos para BRL/USD/EUR).
  // formatCurrency() em lib/formatters.ts faz a conversão.
  balance: number
  amountSpent: number
  currency: string
}

export interface AdRow {
  adId: string
  adName: string
  spend: number
  impressions: number
  reach: number
  frequency: number
  clicks: number
  linkClicks: number
  ctr: number
  cpc: number
  leads: number
  messages: number
  engagements: number
  reactions: number
  follows: number
}

// ── Meta API response types ─────────────────────────────────────────────────

interface MetaAction {
  action_type: string
  value: string
}

interface MetaInsightEntry {
  spend?: string
  reach?: string
  frequency?: string
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
  params: Record<string, string>,
  timeRange?: { since: string; until: string }
): Promise<MetaInsightResponse> {
  const url = new URL(`${GRAPH_API}/${accountId}/insights`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  if (timeRange) {
    url.searchParams.delete('date_preset')
    url.searchParams.set('time_range', JSON.stringify(timeRange))
  }

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

function swallow(e: unknown): null {
  console.error('[meta-insights]', e instanceof Error ? e.message : e)
  return null
}

// "Conversas iniciadas" do Ads Manager — vale para Messenger, Instagram
// Direct e Click-to-WhatsApp (quando o negócio usa WhatsApp Business API).
// NÃO conta mensagens trocadas dentro da conversa, conta a abertura da
// conversa em até 7 dias após o clique no anúncio.
function getConversationsStarted(actions: MetaAction[] | undefined): number {
  return getAction(actions, 'onsite_conversion.messaging_conversation_started_7d')
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
    messages += getConversationsStarted(d.actions)
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
      }).catch(swallow)
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
      }).catch(swallow)
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
      }).catch(swallow)
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
        messages: getConversationsStarted(d.actions),
      })
    }
  }

  return rows.sort((a, b) => b.spend - a.spend).slice(0, 10)
}

// ── Single account ──────────────────────────────────────────────────────────

export const fetchAccountInfo = cache(async function fetchAccountInfo(
  accountId: string,
  token: string
): Promise<AccountInfo> {
  const url = new URL(`${GRAPH_API}/${accountId}`)
  url.searchParams.set('fields', 'id,name,balance,amount_spent,currency')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    // Saldo muda mais rápido que nome — cache mais curto.
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
  })
  const data = await res.json() as {
    id?: string
    name?: string
    balance?: string
    amount_spent?: string
    currency?: string
    error?: { message: string }
  }
  if (data.error) throw new Error(data.error.message)
  return {
    id: data.id ?? accountId,
    name: data.name ?? accountId,
    balance: parseInt(data.balance ?? '0', 10),
    amountSpent: parseInt(data.amount_spent ?? '0', 10),
    currency: data.currency ?? 'BRL',
  }
})

export async function fetchAccountKPIs(
  accountId: string,
  token: string,
  datePreset = 'last_7d'
): Promise<KPIs> {
  const result = await insightsRequest(accountId, token, {
    fields: 'spend,reach,impressions,clicks,inline_link_clicks,actions',
    date_preset: datePreset,
  }).catch(swallow)
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
  }).catch(swallow)

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
  }).catch(swallow)

  const rows: CampaignRow[] = []
  for (const d of result?.data ?? []) {
    rows.push({
      id: d.campaign_id ?? '',
      name: d.campaign_name ?? '',
      status: 'ACTIVE',
      spend: parseFloat(d.spend ?? '0'),
      clicks: parseInt(d.clicks ?? '0'),
      leads: getAction(d.actions, 'lead'),
      messages: getConversationsStarted(d.actions),
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
  }).catch(swallow)
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
  }).catch(swallow)

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
    fields: 'ad_id,ad_name,spend,reach,frequency,impressions,clicks,inline_link_clicks,actions',
    date_preset: datePreset,
    level: 'ad',
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: [campaignId] }]),
  }).catch(swallow)

  const rows: AdRow[] = []
  for (const d of result?.data ?? []) {
    const spend = parseFloat(d.spend ?? '0')
    const impressions = parseInt(d.impressions ?? '0')
    const clicks = parseInt(d.clicks ?? '0')
    const linkClicks = parseInt(d.inline_link_clicks ?? '0')
    rows.push({
      adId: d.ad_id ?? '',
      adName: d.ad_name ?? 'Sem nome',
      spend,
      impressions,
      reach: parseInt(d.reach ?? '0'),
      frequency: parseFloat(d.frequency ?? '0'),
      clicks,
      linkClicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      leads: getAction(d.actions, 'lead'),
      messages: getConversationsStarted(d.actions),
      engagements: getAction(d.actions, 'post_engagement'),
      reactions: getAction(d.actions, 'post_reaction'),
      follows: getAction(d.actions, 'like'),
    })
  }

  return rows.sort((a, b) => b.spend - a.spend)
}

// ── Comparison period (previous period vs current) ──────────────────────────

export interface KPITrends {
  spend: number
  leads: number
  messages: number
  linkClicks: number
  reach: number
}

function formatYMD(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function getComparisonRanges(preset: DatePreset): {
  cur: { since: string; until: string }
  prev: { since: string; until: string }
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ms = 86400000
  if (preset === 'today') {
    const todayStr = formatYMD(today)
    const yesterdayStr = formatYMD(new Date(today.getTime() - ms))
    return {
      cur:  { since: todayStr,      until: todayStr },
      prev: { since: yesterdayStr,  until: yesterdayStr },
    }
  }

  if (preset === 'yesterday') {
    const yest = formatYMD(new Date(today.getTime() - ms))
    const dayBefore = formatYMD(new Date(today.getTime() - 2 * ms))
    return {
      cur:  { since: yest,      until: yest },
      prev: { since: dayBefore, until: dayBefore },
    }
  }

  const days = preset === 'last_7d' ? 7 : preset === 'last_14d' ? 14 : preset === 'last_30d' ? 30 : 90

  return {
    cur:  { since: formatYMD(new Date(today.getTime() - days * ms)),       until: formatYMD(new Date(today.getTime() - ms)) },
    prev: { since: formatYMD(new Date(today.getTime() - days * 2 * ms)),   until: formatYMD(new Date(today.getTime() - (days + 1) * ms)) },
  }
}

export function computeKPITrends(cur: KPIs, prev: KPIs): KPITrends {
  const pct = (c: number, p: number): number => (p === 0 ? 0 : ((c - p) / p) * 100)
  return {
    spend:      pct(cur.spend,      prev.spend),
    leads:      pct(cur.leads,      prev.leads),
    messages:   pct(cur.messages,   prev.messages),
    linkClicks: pct(cur.linkClicks, prev.linkClicks),
    reach:      pct(cur.reach,      prev.reach),
  }
}

export async function fetchKPIsForRange(
  accountIds: string[],
  token: string,
  since: string,
  until: string
): Promise<KPIs> {
  const results = await Promise.all(
    accountIds.map((id) =>
      insightsRequest(
        id,
        token,
        { fields: 'spend,reach,impressions,clicks,inline_link_clicks,actions' },
        { since, until }
      ).catch(swallow)
    )
  )
  return aggregateKPIs(results)
}

export async function fetchAccountKPIsForRange(
  accountId: string,
  token: string,
  since: string,
  until: string
): Promise<KPIs> {
  const result = await insightsRequest(
    accountId,
    token,
    { fields: 'spend,reach,impressions,clicks,inline_link_clicks,actions' },
    { since, until }
  ).catch(swallow)
  return aggregateKPIs([result])
}
