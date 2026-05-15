import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight,
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
  Building2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'
import {
  fetchAccountInfo,
  fetchAccountKPIs,
  fetchAccountDailySpend,
  fetchAccountCampaigns,
  type KPIs,
} from '@/lib/meta-insights'
import { SpendChart } from '../spend-chart'
import { CampaignsTable } from '../campaigns-table'
import { MetricSection } from '../metric-card'
import { DatePresetFilter, parseDatePreset } from '../date-preset-filter'
import { SpendPieChart } from '../spend-pie-chart'

interface Props {
  params: Promise<{ clientId: string; accountId: string }>
  searchParams: Promise<{ preset?: string }>
}

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(v)
}
function num(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString('pt-BR')
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
    .select('ad_account_ids, is_valid, token_encrypted')
    .eq('client_id', clientId)
    .single()

  if (!bmToken?.is_valid || !bmToken.token_encrypted) notFound()
  if (!bmToken.ad_account_ids?.includes(accountId)) notFound()

  const token = decryptToken(bmToken.token_encrypted)

  const [accountInfo, kpis, dailySpend, campaigns] = await Promise.all([
    fetchAccountInfo(accountId, token).catch(() => ({ id: accountId, name: accountId })),
    fetchAccountKPIs(accountId, token, preset),
    fetchAccountDailySpend(accountId, token, preset),
    fetchAccountCampaigns(accountId, token, preset),
  ])

  const presetLabel: Record<string, string> = {
    last_7d: 'últimos 7 dias',
    last_14d: 'últimos 14 dias',
    last_30d: 'últimos 30 dias',
    last_90d: 'últimos 90 dias',
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb extension */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground -mt-4">
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Building2 className="h-3.5 w-3.5" />
          {accountInfo.name !== accountId ? accountInfo.name : accountId}
        </span>
      </div>

      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">{accountInfo.name}</h2>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{accountId}</p>
        </div>
        <DatePresetFilter current={preset} />
      </div>

      {/* Metric sections */}
      <div className="flex flex-col gap-6">
        <p className="text-xs text-muted-foreground">{presetLabel[preset]}</p>
        {buildSections(kpis).map((section) => (
          <MetricSection key={section.title} {...section} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Distribuição de Investimento</CardTitle>
            <p className="text-xs text-muted-foreground">por campanha · {presetLabel[preset]}</p>
          </CardHeader>
          <CardContent>
            <SpendPieChart data={campaigns} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Evolução de Investimento</CardTitle>
            <p className="text-xs text-muted-foreground">{presetLabel[preset]}</p>
          </CardHeader>
          <CardContent>
            <SpendChart data={dailySpend} />
          </CardContent>
        </Card>
      </div>

      {/* Campaign table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Campanhas</CardTitle>
          <p className="text-xs text-muted-foreground">
            {presetLabel[preset]} · clique para ver detalhes
          </p>
        </CardHeader>
        <CardContent>
          <CampaignsTable data={campaigns} clientId={clientId} accountId={accountId} />
        </CardContent>
      </Card>
    </div>
  )
}
