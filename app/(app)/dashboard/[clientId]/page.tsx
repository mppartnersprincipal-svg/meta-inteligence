import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  DollarSign,
  Users,
  Eye,
  Repeat2,
  Layers,
  MousePointerClick,
  BarChart2,
  TrendingUp,
  Wallet,
  UserCheck,
  MessageCircle,
  CreditCard,
  Heart,
  ThumbsUp,
  MessageSquare,
  Share2,
  ArrowRight,
  Building2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'
import { fetchKPIs, fetchDailySpend, fetchCampaigns, type KPIs } from '@/lib/meta-insights'
import { SpendChart } from './spend-chart'
import { CampaignsTable } from './campaigns-table'
import { MetricSection } from './metric-card'

interface Props {
  params: Promise<{ clientId: string }>
}

function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value)
}

function num(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString('pt-BR')
}

function buildSections(kpis: KPIs) {
  return [
    {
      title: 'Alcance & Investimento',
      color: 'blue' as const,
      icon: DollarSign,
      metrics: [
        { label: 'Investimento', value: brl(kpis.spend), icon: DollarSign },
        { label: 'Alcance', value: num(kpis.reach), icon: Users },
        { label: 'Impressões', value: num(kpis.impressions), icon: Eye },
        { label: 'Frequência', value: `${kpis.frequency.toFixed(2)}x`, icon: Repeat2 },
        { label: 'CPM', value: brl(kpis.cpm), icon: Layers },
      ],
    },
    {
      title: 'Cliques & Tráfego',
      color: 'green' as const,
      icon: MousePointerClick,
      metrics: [
        { label: 'Cliques no link', value: num(kpis.linkClicks), icon: MousePointerClick },
        { label: 'Cliques totais', value: num(kpis.clicks), icon: BarChart2 },
        { label: 'CTR do link', value: `${kpis.linkCtr.toFixed(2)}%`, icon: TrendingUp },
        { label: 'CPC', value: brl(kpis.cpc), icon: Wallet },
      ],
    },
    {
      title: 'Resultados',
      color: 'orange' as const,
      icon: UserCheck,
      metrics: [
        { label: 'Leads', value: kpis.leads > 0 ? num(kpis.leads) : '—', icon: UserCheck },
        { label: 'Custo por lead', value: kpis.costPerLead > 0 ? brl(kpis.costPerLead) : '—', icon: CreditCard },
        { label: 'Mensagens', value: kpis.messages > 0 ? num(kpis.messages) : '—', icon: MessageCircle },
        { label: 'Custo por msg', value: kpis.costPerMessage > 0 ? brl(kpis.costPerMessage) : '—', icon: CreditCard },
      ],
    },
    {
      title: 'Engajamento',
      color: 'purple' as const,
      icon: Heart,
      metrics: [
        { label: 'Engajamentos', value: num(kpis.postEngagements), icon: Heart },
        { label: 'Reações', value: num(kpis.reactions), icon: ThumbsUp },
        { label: 'Comentários', value: num(kpis.comments), icon: MessageSquare },
        { label: 'Compartilhamentos', value: num(kpis.shares), icon: Share2 },
      ],
    },
  ]
}

export default async function ClientDashboardPage({ params }: Props) {
  const { clientId } = await params
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
  let dailySpend = null
  let campaigns = null
  let insightsError: string | null = null

  if (bmToken?.is_valid && bmToken.token_encrypted && bmToken.ad_account_ids?.length > 0) {
    try {
      const token = decryptToken(bmToken.token_encrypted)
      const accountIds = bmToken.ad_account_ids

      ;[kpis, dailySpend, campaigns] = await Promise.all([
        fetchKPIs(accountIds, token, 'last_30d'),
        fetchDailySpend(accountIds, token, 'last_30d'),
        fetchCampaigns(accountIds, token, 'last_30d'),
      ])
    } catch (e) {
      insightsError = e instanceof Error ? e.message : 'Erro ao buscar dados da Meta.'
    }
  }

  const accountIds: string[] = bmToken?.ad_account_ids ?? []

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">{client.category}</p>
        </div>
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

      {insightsError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {insightsError}
        </div>
      )}

      {/* Account cards */}
      {accountIds.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Contas de Anúncio
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accountIds.map((accountId) => (
              <Link
                key={accountId}
                href={`/dashboard/${clientId}/${accountId}`}
                className="group flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
              >
                <div>
                  <p className="text-xs text-muted-foreground">Conta de Anúncio</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold">{accountId}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Metric sections */}
      {kpis ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Visão consolidada · últimos 30 dias · todas as contas
            </p>
          </div>
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

      {/* Charts */}
      {(dailySpend || campaigns) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Evolução de Investimento</CardTitle>
              <p className="text-xs text-muted-foreground">últimos 30 dias · todas as contas</p>
            </CardHeader>
            <CardContent>
              <SpendChart data={dailySpend ?? []} />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Top Campanhas</CardTitle>
              <p className="text-xs text-muted-foreground">últimos 30 dias · por investimento</p>
            </CardHeader>
            <CardContent>
              <CampaignsTable
                data={campaigns ?? []}
                clientId={clientId}
                accountId={accountIds[0]}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
