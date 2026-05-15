import { notFound } from 'next/navigation'
import { ChevronRight, Megaphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'
import {
  fetchCampaignKPIs,
  fetchCampaignDailySpend,
  fetchCampaignAds,
  type KPIs,
  type DailySpend,
} from '@/lib/meta-insights'
import { buildSections } from '@/lib/dashboard-sections'
import { SpendChart } from '../../../spend-chart'
import { MetricSection } from '../../../metric-card'
import { DatePresetFilter } from '../../../date-preset-filter'
import { TabNav } from './tab-nav'
import { parseDatePreset, parseTab } from '@/lib/dashboard-params'
import { CreativesTable } from './creatives-table'

interface Props {
  params: Promise<{ clientId: string; accountId: string; campaignId: string }>
  searchParams: Promise<{ preset?: string; tab?: string }>
}


function computeTrends(daily: DailySpend[]) {
  if (daily.length === 0) return null

  const sorted = [...daily].sort((a, b) => b.spend - a.spend)
  const maxDay = sorted[0]
  const minDay = sorted[sorted.length - 1]
  const total = daily.reduce((s, d) => s + d.spend, 0)
  const avg = total / daily.length

  const formatDate = (d: string) => {
    const [, m, day] = d.split('-')
    return `${day}/${m}`
  }

  return { maxDay: { ...maxDay, date: formatDate(maxDay.date) }, minDay: { ...minDay, date: formatDate(minDay.date) }, avg }
}

export default async function CampaignDetailPage({ params, searchParams }: Props) {
  const { clientId, accountId, campaignId } = await params
  const { preset: rawPreset, tab: rawTab } = await searchParams
  const preset = parseDatePreset(rawPreset)
  const tab = parseTab(rawTab)

  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const { data: bmToken } = await supabase
    .from('bm_tokens')
    .select('ad_account_ids, is_valid, token_encrypted')
    .eq('client_id', clientId)
    .single()

  if (!bmToken?.is_valid || !bmToken.token_encrypted) notFound()
  if (!bmToken.ad_account_ids?.includes(accountId)) notFound()

  const token = decryptToken(bmToken.token_encrypted)

  const presetLabel: Record<string, string> = {
    last_7d: 'últimos 7 dias',
    last_14d: 'últimos 14 dias',
    last_30d: 'últimos 30 dias',
    last_90d: 'últimos 90 dias',
  }

  const [kpis, dailySpend, ads] = await Promise.all([
    fetchCampaignKPIs(campaignId, accountId, token, preset),
    tab === 'tempo' || tab === 'gerais'
      ? fetchCampaignDailySpend(campaignId, accountId, token, preset)
      : Promise.resolve([]),
    tab === 'criativos'
      ? fetchCampaignAds(campaignId, accountId, token, preset)
      : Promise.resolve([]),
  ])

  const trends = computeTrends(dailySpend)

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb extension */}
      <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground -mt-4">
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="hover:text-foreground transition-colors">{accountId}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Megaphone className="h-3.5 w-3.5" />
          Campanha
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Detalhes da Campanha</h2>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">ID: {campaignId}</p>
        </div>
        <DatePresetFilter current={preset} />
      </div>

      {/* Tab navigation */}
      <TabNav current={tab} />

      {/* Tab: Gerais */}
      {tab === 'gerais' && (
        <div className="flex flex-col gap-6">
          <p className="text-xs text-muted-foreground">{presetLabel[preset]}</p>
          {buildSections(kpis).map((section) => (
            <MetricSection key={section.title} {...section} />
          ))}

          {dailySpend.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Investimento no Período</CardTitle>
                <p className="text-xs text-muted-foreground">{presetLabel[preset]}</p>
              </CardHeader>
              <CardContent>
                <SpendChart data={dailySpend} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Criativos */}
      {tab === 'criativos' && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Desempenho por anúncio · {presetLabel[preset]}
          </p>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <CreativesTable data={ads} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Tempo */}
      {tab === 'tempo' && (
        <div className="flex flex-col gap-4">
          {trends && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-l-4 border-l-[color:var(--chart-1)] shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Dia de maior investimento</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(trends.maxDay.spend)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{trends.maxDay.date}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-[color:var(--chart-2)] shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Média diária</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(trends.avg)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">por dia no período</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-[color:var(--chart-4)] shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Dia de menor investimento</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(trends.minDay.spend)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{trends.minDay.date}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Evolução de Investimento</CardTitle>
              <p className="text-xs text-muted-foreground">{presetLabel[preset]} · diário</p>
            </CardHeader>
            <CardContent>
              <SpendChart data={dailySpend} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
