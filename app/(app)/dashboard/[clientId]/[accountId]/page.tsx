import { notFound } from 'next/navigation'
import { ChevronRight, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'
import {
  fetchAccountInfo,
  fetchAccountKPIs,
  fetchAccountKPIsForRange,
  fetchAccountDailySpend,
  fetchAccountCampaigns,
  getComparisonRanges,
  computeKPITrends,
} from '@/lib/meta-insights'
import { buildSections } from '@/lib/dashboard-sections'
import { formatCurrency } from '@/lib/formatters'
import { syncBalanceAlertsForClient } from '@/lib/balance-alerts'
import { SpendChart } from '../spend-chart'
import { MetricSection } from '../metric-card'
import { DatePresetFilter } from '../date-preset-filter'
import { parseDatePreset } from '@/lib/dashboard-params'
import { SpendPieChart } from '../spend-pie-chart'
import { KpiHighlightRow } from '../kpi-highlight-row'
import { CampaignBarChart } from '../campaign-bar-chart'
import { DayOfWeekChart } from '../day-of-week-chart'
import { MetricGauge } from '../metric-gauge'
import { CampaignProgressBars } from '../campaign-progress-bars'
import { AnalysisPanel } from './analysis-panel'

interface Props {
  params: Promise<{ clientId: string; accountId: string }>
  searchParams: Promise<{ preset?: string }>
}

export default async function AccountDashboardPage({ params, searchParams }: Props) {
  const { clientId, accountId } = await params
  const { preset: rawPreset } = await searchParams
  const preset = parseDatePreset(rawPreset)

  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const { data: bmToken } = await supabase
    .from('bm_tokens')
    .select('ad_account_ids, meta_tokens!inner(token_encrypted, is_valid)')
    .eq('client_id', clientId)
    .single()

  const metaToken = bmToken
    ? (Array.isArray(bmToken.meta_tokens) ? bmToken.meta_tokens[0] : bmToken.meta_tokens)
    : null

  if (!metaToken?.is_valid || !metaToken.token_encrypted) notFound()
  if (!bmToken?.ad_account_ids?.includes(accountId)) notFound()

  const token = decryptToken(metaToken.token_encrypted as string)
  const { prev } = getComparisonRanges(preset)

  const [accountInfo, kpis, prevKpis, dailySpend, campaigns] = await Promise.all([
    fetchAccountInfo(accountId, token).catch(() => ({
      id: accountId,
      name: accountId,
      balance: 0,
      amountSpent: 0,
      currency: 'BRL',
    })),
    fetchAccountKPIs(accountId, token, preset),
    fetchAccountKPIsForRange(accountId, token, prev.since, prev.until).catch(() => null),
    fetchAccountDailySpend(accountId, token, preset),
    fetchAccountCampaigns(accountId, token, preset),
  ])

  // Sincroniza alerta de saldo dessa conta (não bloqueia render).
  await syncBalanceAlertsForClient(clientId, [accountInfo]).catch(() => {})

  const trends = prevKpis ? computeKPITrends(kpis, prevKpis) : undefined

  const presetLabel: Record<string, string> = {
    today:    'hoje',
    yesterday: 'ontem',
    last_7d:  'últimos 7 dias',
    last_14d: 'últimos 14 dias',
    last_30d: 'últimos 30 dias',
    last_90d: 'últimos 90 dias',
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground -mt-4">
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Building2 className="h-3.5 w-3.5" />
          {accountInfo.name !== accountId ? accountInfo.name : accountId}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">{accountInfo.name}</h2>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{accountId}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(accountInfo.balance > 0 || accountInfo.amountSpent > 0) && (
            <div className="flex items-baseline gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5">
              <span
                className="text-[10px] text-muted-foreground uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
              >
                Saldo
              </span>
              <span
                className="text-sm font-semibold text-foreground tabular-nums"
                style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
              >
                {formatCurrency(accountInfo.balance, accountInfo.currency)}
              </span>
            </div>
          )}
          <DatePresetFilter current={preset} />
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">

        {/* ── Main column ── */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* KPI highlight row */}
          <KpiHighlightRow kpis={kpis} trends={trends} />

          {/* AI Analysis */}
          <AnalysisPanel
            clientId={clientId}
            accountId={accountId}
            accountName={accountInfo.name}
            preset={preset}
            kpis={kpis}
            trends={trends}
            campaigns={campaigns}
            dailySpend={dailySpend}
          />

          {/* Spend column chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Investimento Diário</CardTitle>
              <p className="text-xs text-muted-foreground">{presetLabel[preset]}</p>
            </CardHeader>
            <CardContent>
              <SpendChart data={dailySpend} height={220} />
            </CardContent>
          </Card>

          {/* Campaign progress bars */}
          {campaigns.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top Campanhas</CardTitle>
                <p className="text-xs text-muted-foreground">{presetLabel[preset]} · por investimento</p>
              </CardHeader>
              <CardContent>
                <CampaignProgressBars
                  data={campaigns}
                  clientId={clientId}
                  accountId={accountId}
                />
              </CardContent>
            </Card>
          )}

          {/* Detailed metric sections */}
          <div className="flex flex-col gap-6">
            <p className="text-xs text-muted-foreground">{presetLabel[preset]}</p>
            {buildSections(kpis).map((section) => (
              <MetricSection key={section.title} {...section} />
            ))}
          </div>
        </div>

        {/* ── Sidebar column ── */}
        <div className="flex flex-col gap-4">

          {/* Dia mais ativo */}
          {dailySpend.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold">Dia Mais Ativo</CardTitle>
                <p className="text-xs text-muted-foreground">investimento médio por dia da semana</p>
              </CardHeader>
              <CardContent className="pt-2">
                <DayOfWeekChart data={dailySpend} />
              </CardContent>
            </Card>
          )}

          {/* CTR Gauge */}
          <Card className="shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-semibold">Link CTR</CardTitle>
              <p className="text-xs text-muted-foreground">taxa de clique nos links</p>
            </CardHeader>
            <CardContent className="pt-3">
              <MetricGauge
                value={kpis.linkCtr}
                max={5}
                label="CTR atual"
                sublabel="benchmark de mercado: 5%"
              />
            </CardContent>
          </Card>

          {/* Pie chart */}
          {campaigns.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold">Distribuição por Campanha</CardTitle>
                <p className="text-xs text-muted-foreground">{presetLabel[preset]}</p>
              </CardHeader>
              <CardContent>
                <SpendPieChart data={campaigns} />
              </CardContent>
            </Card>
          )}

          {/* Campaign bar chart */}
          {campaigns.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold">Campanhas por Investimento</CardTitle>
                <p className="text-xs text-muted-foreground">clique para ver detalhes</p>
              </CardHeader>
              <CardContent>
                <CampaignBarChart data={campaigns} clientId={clientId} accountId={accountId} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
