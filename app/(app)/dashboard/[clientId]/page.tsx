import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Building2, Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'
import {
  fetchKPIs,
  fetchKPIsForRange,
  fetchDailySpend,
  fetchCampaigns,
  fetchAccountInfo,
  getComparisonRanges,
  computeKPITrends,
  type KPIs,
  type AccountInfo,
} from '@/lib/meta-insights'
import { buildSections } from '@/lib/dashboard-sections'
import { formatCurrency } from '@/lib/formatters'
import { SpendChart } from './spend-chart'
import { MetricSection } from './metric-card'
import { KpiHighlightRow } from './kpi-highlight-row'
import { CampaignBarChart } from './campaign-bar-chart'
import { SpendPieChart } from './spend-pie-chart'
import { DayOfWeekChart } from './day-of-week-chart'
import { MetricGauge } from './metric-gauge'
import { CampaignProgressBars } from './campaign-progress-bars'
import { DatePresetFilter } from './date-preset-filter'
import { parseDatePreset } from '@/lib/dashboard-params'

interface Props {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ preset?: string }>
}

export default async function ClientDashboardPage({ params, searchParams }: Props) {
  const { clientId } = await params
  const { preset: rawPreset } = await searchParams
  const preset = parseDatePreset(rawPreset)

  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, logo_url, category')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const { data: bmToken } = await supabase
    .from('bm_tokens')
    .select('id, bm_id, ad_account_ids, is_valid, last_validated_at, token_encrypted')
    .eq('client_id', clientId)
    .single()

  let kpis: KPIs | null = null
  let prevKpis: KPIs | null = null
  let dailySpend = null
  let campaigns = null
  let accountsInfo: AccountInfo[] = []
  let insightsError: string | null = null

  if (bmToken?.is_valid && bmToken.token_encrypted && bmToken.ad_account_ids?.length > 0) {
    try {
      const token = decryptToken(bmToken.token_encrypted)
      const accountIds: string[] = bmToken.ad_account_ids
      const { prev } = getComparisonRanges(preset)

      ;[kpis, prevKpis, dailySpend, campaigns, accountsInfo] = await Promise.all([
        fetchKPIs(accountIds, token, preset),
        fetchKPIsForRange(accountIds, token, prev.since, prev.until).catch(() => null),
        fetchDailySpend(accountIds, token, preset),
        fetchCampaigns(accountIds, token, preset),
        Promise.all(
          accountIds.map((id) =>
            fetchAccountInfo(id, token).catch(
              () => ({ id, name: id, balance: 0, amountSpent: 0, currency: 'BRL' } satisfies AccountInfo)
            )
          )
        ),
      ])
    } catch (e) {
      insightsError = e instanceof Error ? e.message : 'Erro ao buscar dados da Meta.'
    }
  }

  const trends = kpis && prevKpis ? computeKPITrends(kpis, prevKpis) : undefined
  const accountIds: string[] = bmToken?.ad_account_ids ?? []
  const accountInfoById = new Map(accountsInfo.map((a) => [a.id, a]))

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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] mb-1"
            style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            Dashboard do cliente
          </p>
          <h1
            className="text-3xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-hanken), sans-serif' }}
          >
            {client.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">{client.category}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DatePresetFilter current={preset} />
          <Badge
            variant={bmToken?.is_valid ? 'default' : 'destructive'}
            className="flex items-center gap-1.5 px-3 py-1 text-xs"
          >
            {bmToken?.is_valid ? (
              <><Wifi className="h-3 w-3" /> Conectado</>
            ) : (
              <><WifiOff className="h-3 w-3" /> {bmToken ? 'Token inválido' : 'Sem BM'}</>
            )}
          </Badge>
        </div>
      </div>

      {insightsError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {insightsError}
        </div>
      )}

      {/* 2-column layout */}
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">

        {/* ── Main column ── */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* KPI highlight row */}
          {kpis && <KpiHighlightRow kpis={kpis} trends={trends} />}

          {/* Account cards */}
          {accountIds.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Contas de Anúncio
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {accountIds.map((accountId) => {
                  const info = accountInfoById.get(accountId)
                  const name = info?.name ?? accountId
                  const hasName = name !== accountId
                  const hasBalance = info != null && (info.balance > 0 || info.amountSpent > 0)
                  return (
                    <Link
                      key={accountId}
                      href={`/dashboard/${clientId}/${accountId}`}
                      className="group flex items-center justify-between gap-3 rounded-xl px-5 py-4 glass-card glow-hover transition-all duration-300"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[10px] text-muted-foreground uppercase tracking-wider"
                          style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
                        >
                          Conta de Anúncio
                        </p>
                        <p
                          className="mt-0.5 text-sm font-semibold text-foreground truncate"
                          style={{ fontFamily: 'var(--font-hanken), sans-serif' }}
                          title={name}
                        >
                          {name}
                        </p>
                        {hasName && (
                          <p
                            className="mt-0.5 text-[10px] text-muted-foreground/70 truncate"
                            style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
                          >
                            {accountId}
                          </p>
                        )}
                        {hasBalance && (
                          <div className="mt-2 flex items-baseline gap-1.5">
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
                              {formatCurrency(info.balance, info.currency)}
                            </span>
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Spend column chart */}
          {dailySpend && dailySpend.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Investimento Diário</CardTitle>
                <p className="text-xs text-muted-foreground">{presetLabel[preset]} · todas as contas</p>
              </CardHeader>
              <CardContent>
                <SpendChart data={dailySpend} height={220} />
              </CardContent>
            </Card>
          )}

          {/* Campaign progress bars */}
          {campaigns && campaigns.length > 0 && accountIds.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top Campanhas</CardTitle>
                <p className="text-xs text-muted-foreground">{presetLabel[preset]} · por investimento</p>
              </CardHeader>
              <CardContent>
                <CampaignProgressBars
                  data={campaigns}
                  clientId={clientId}
                  accountId={accountIds[0]}
                />
              </CardContent>
            </Card>
          )}

          {/* Detailed metric sections */}
          {kpis ? (
            <div className="flex flex-col gap-6">
              <p className="text-xs font-medium text-muted-foreground">
                Métricas detalhadas · {presetLabel[preset]} · todas as contas
              </p>
              {buildSections(kpis).map((section) => (
                <MetricSection key={section.title} {...section} />
              ))}
            </div>
          ) : (
            !insightsError && (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  {bmToken ? 'Configure as contas de anúncio para ver métricas.' : 'Sem dados disponíveis.'}
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* ── Sidebar column ── */}
        <div className="flex flex-col gap-4">

          {/* Dia mais ativo */}
          {dailySpend && dailySpend.length > 0 && (
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
          {kpis && (
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
          )}

          {/* Pie chart */}
          {campaigns && campaigns.length > 0 && (
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
          {campaigns && campaigns.length > 0 && accountIds.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold">Campanhas por Investimento</CardTitle>
                <p className="text-xs text-muted-foreground">clique para ver detalhes</p>
              </CardHeader>
              <CardContent>
                <CampaignBarChart
                  data={campaigns}
                  clientId={clientId}
                  accountId={accountIds[0]}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
