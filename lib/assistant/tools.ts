import type Anthropic from '@anthropic-ai/sdk'
import {
  fetchKPIs,
  fetchDailySpend,
  fetchCampaigns,
  fetchAccountDailySpend,
  fetchCampaignKPIs,
  fetchCampaignAds,
  fetchKPIsForRange,
  getComparisonRanges,
  computeKPITrends,
} from '@/lib/meta-insights'
import type { DatePreset } from '@/lib/dashboard-params'
import { parseDatePreset } from '@/lib/dashboard-params'

export interface ToolContext {
  token: string
  accountIds: string[]
}

export const assistantTools: Anthropic.Tool[] = [
  {
    name: 'get_client_overview',
    description:
      'Busca KPIs consolidados de TODAS as contas de anúncio do cliente para o período. Retorna spend, reach, impressions, frequency, cpm, clicks, linkClicks, linkCtr, cpc, leads, costPerLead, messages, costPerMessage, postEngagements, reactions, comments, shares. Use para visão geral / "como está o cliente".',
    input_schema: {
      type: 'object',
      properties: {
        date_preset: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'last_90d'],
          description: 'Período de análise. Padrão: last_7d',
        },
      },
    },
  },
  {
    name: 'get_client_campaigns',
    description:
      'Lista as principais campanhas de TODAS as contas do cliente (top 10 por gasto), com id, name, status, spend, clicks, leads, messages. Use quando o usuário pergunta sobre campanhas específicas ou quer um panorama das campanhas ativas.',
    input_schema: {
      type: 'object',
      properties: {
        date_preset: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'last_90d'],
          description: 'Período de análise. Padrão: last_7d',
        },
      },
    },
  },
  {
    name: 'compare_periods',
    description:
      'Compara o período atual com o período anterior equivalente (ex: last_7d compara com os 7 dias anteriores aos últimos 7 dias) e retorna variação percentual de spend, leads, messages, linkClicks e reach. Use para identificar tendências e responder "como estamos vs período anterior".',
    input_schema: {
      type: 'object',
      properties: {
        date_preset: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'last_90d'],
          description: 'Período atual a comparar. Padrão: last_7d',
        },
      },
    },
  },
  {
    name: 'get_campaign_detail',
    description:
      'Busca KPIs de UMA campanha específica. Requer campaign_id (obtido via get_client_campaigns) e account_id da campanha. Retorna o mesmo formato de get_client_overview mas para a campanha sozinha.',
    input_schema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'ID da campanha' },
        account_id: { type: 'string', description: 'ID da conta de anúncio (formato act_XXXXX)' },
        date_preset: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'last_90d'],
          description: 'Período. Padrão: last_7d',
        },
      },
      required: ['campaign_id', 'account_id'],
    },
  },
  {
    name: 'get_campaign_ads',
    description:
      'Lista TODOS os anúncios (criativos) de uma campanha com métricas detalhadas: adId, adName, spend, impressions, reach, frequency, clicks, linkClicks, ctr, cpc, leads, messages, engagements, reactions, follows. Use para identificar quais criativos pausar/escalar.',
    input_schema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'ID da campanha' },
        account_id: { type: 'string', description: 'ID da conta de anúncio' },
        date_preset: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'last_90d'],
          description: 'Período. Padrão: last_7d',
        },
      },
      required: ['campaign_id', 'account_id'],
    },
  },
  {
    name: 'get_account_daily_spend',
    description:
      'Retorna série temporal de investimento diário (date + spend) de UMA conta específica. Use para análise de tendência, sazonalidade ou identificar dias atípicos. Para visão consolidada multi-contas use get_client_overview que já inclui o agregado.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta de anúncio' },
        date_preset: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'last_90d'],
          description: 'Período. Padrão: last_30d',
        },
      },
      required: ['account_id'],
    },
  },
]

function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === 0 || v === null || v === undefined) continue
    if (typeof v === 'number') out[k] = Number(v.toFixed(2))
    else out[k] = v
  }
  return out as Partial<T>
}

export async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  try {
    const preset = parseDatePreset(input.date_preset as string | undefined) as DatePreset

    switch (name) {
      case 'get_client_overview': {
        const [kpis, daily] = await Promise.all([
          fetchKPIs(ctx.accountIds, ctx.token, preset),
          fetchDailySpend(ctx.accountIds, ctx.token, preset),
        ])
        return JSON.stringify({
          period: preset,
          accounts_count: ctx.accountIds.length,
          kpis: clean(kpis as unknown as Record<string, unknown>),
          daily_spend: daily.map((d) => ({ date: d.date, spend: Number(d.spend.toFixed(2)) })),
        })
      }

      case 'get_client_campaigns': {
        const campaigns = await fetchCampaigns(ctx.accountIds, ctx.token, preset)
        return JSON.stringify({
          period: preset,
          campaigns: campaigns.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            spend: Number(c.spend.toFixed(2)),
            clicks: c.clicks,
            leads: c.leads || null,
            messages: c.messages || null,
            cpl: c.leads > 0 ? Number((c.spend / c.leads).toFixed(2)) : null,
          })),
        })
      }

      case 'compare_periods': {
        const { cur, prev } = getComparisonRanges(preset)
        const [curKpis, prevKpis] = await Promise.all([
          fetchKPIsForRange(ctx.accountIds, ctx.token, cur.since, cur.until),
          fetchKPIsForRange(ctx.accountIds, ctx.token, prev.since, prev.until),
        ])
        const trends = computeKPITrends(curKpis, prevKpis)
        return JSON.stringify({
          period_label: preset,
          current_range: cur,
          previous_range: prev,
          current: clean(curKpis as unknown as Record<string, unknown>),
          previous: clean(prevKpis as unknown as Record<string, unknown>),
          trends_pct: {
            spend: Number(trends.spend.toFixed(1)),
            leads: Number(trends.leads.toFixed(1)),
            messages: Number(trends.messages.toFixed(1)),
            linkClicks: Number(trends.linkClicks.toFixed(1)),
            reach: Number(trends.reach.toFixed(1)),
          },
        })
      }

      case 'get_campaign_detail': {
        const campaignId = String(input.campaign_id ?? '')
        const accountId = String(input.account_id ?? '')
        if (!campaignId || !accountId) {
          return JSON.stringify({ error: 'campaign_id e account_id são obrigatórios' })
        }
        if (!ctx.accountIds.includes(accountId)) {
          return JSON.stringify({ error: `account_id ${accountId} não pertence a este cliente` })
        }
        const kpis = await fetchCampaignKPIs(campaignId, accountId, ctx.token, preset)
        return JSON.stringify({
          period: preset,
          campaign_id: campaignId,
          account_id: accountId,
          kpis: clean(kpis as unknown as Record<string, unknown>),
        })
      }

      case 'get_campaign_ads': {
        const campaignId = String(input.campaign_id ?? '')
        const accountId = String(input.account_id ?? '')
        if (!campaignId || !accountId) {
          return JSON.stringify({ error: 'campaign_id e account_id são obrigatórios' })
        }
        if (!ctx.accountIds.includes(accountId)) {
          return JSON.stringify({ error: `account_id ${accountId} não pertence a este cliente` })
        }
        const ads = await fetchCampaignAds(campaignId, accountId, ctx.token, preset)
        return JSON.stringify({
          period: preset,
          campaign_id: campaignId,
          ads: ads.map((a) => ({
            id: a.adId,
            name: a.adName,
            spend: Number(a.spend.toFixed(2)),
            impressions: a.impressions || null,
            reach: a.reach || null,
            frequency: a.frequency > 0 ? Number(a.frequency.toFixed(2)) : null,
            clicks: a.clicks || null,
            linkClicks: a.linkClicks || null,
            ctr: Number(a.ctr.toFixed(2)),
            cpc: a.cpc > 0 ? Number(a.cpc.toFixed(2)) : null,
            leads: a.leads || null,
            messages: a.messages || null,
            engagements: a.engagements || null,
            reactions: a.reactions || null,
            follows: a.follows || null,
          })),
        })
      }

      case 'get_account_daily_spend': {
        const accountId = String(input.account_id ?? '')
        if (!accountId) return JSON.stringify({ error: 'account_id é obrigatório' })
        if (!ctx.accountIds.includes(accountId)) {
          return JSON.stringify({ error: `account_id ${accountId} não pertence a este cliente` })
        }
        const data = await fetchAccountDailySpend(accountId, ctx.token, preset)
        return JSON.stringify({
          period: preset,
          account_id: accountId,
          daily: data.map((d) => ({ date: d.date, spend: Number(d.spend.toFixed(2)) })),
        })
      }

      default:
        return JSON.stringify({ error: `Tool desconhecida: ${name}` })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return JSON.stringify({ error: `Falha ao executar ${name}: ${message}` })
  }
}
