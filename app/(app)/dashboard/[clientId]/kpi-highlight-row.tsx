import { DollarSign, UserCheck, MousePointerClick, Eye } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { KPIs, KPITrends } from '@/lib/meta-insights'
import { brl, num } from '@/lib/formatters'
import { TrendBadge } from './trend-badge'

type Color = 'blue' | 'green' | 'orange' | 'purple'

const colorStyle: Record<Color, { iconCls: string; topCls: string }> = {
  blue:   { iconCls: 'bg-[color:var(--chart-1)]/15 text-[color:var(--chart-1)]', topCls: 'bg-[color:var(--chart-1)]' },
  green:  { iconCls: 'bg-[color:var(--chart-2)]/15 text-[color:var(--chart-2)]', topCls: 'bg-[color:var(--chart-2)]' },
  orange: { iconCls: 'bg-[color:var(--chart-4)]/15 text-[color:var(--chart-4)]', topCls: 'bg-[color:var(--chart-4)]' },
  purple: { iconCls: 'bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)]', topCls: 'bg-[color:var(--chart-3)]' },
}

interface KpiItem {
  label: string
  value: string
  subtitle: string
  icon: LucideIcon
  color: Color
  trend?: number
  positiveIsGood?: boolean
  prevValue?: string
}

function KpiHighlightCard({ label, value, subtitle, icon: Icon, color, trend, positiveIsGood = true, prevValue }: KpiItem) {
  const s = colorStyle[color]
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-1 ${s.topCls}`} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconCls}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="text-3xl font-bold tabular-nums leading-none">{value}</p>
      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        {trend !== undefined && (
          <TrendBadge value={trend} positiveIsGood={positiveIsGood} />
        )}
        {prevValue && (
          <p className="text-xs text-muted-foreground">vs. {prevValue} ant.</p>
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}

interface KpiHighlightRowProps {
  kpis: KPIs
  trends?: KPITrends
}

export function KpiHighlightRow({ kpis, trends }: KpiHighlightRowProps) {
  // Calculate previous period values from current + trend%
  const prevSpend    = trends ? kpis.spend      / (1 + trends.spend      / 100) : undefined
  const prevLeads    = trends ? kpis.leads       / (1 + trends.leads      / 100) : undefined
  const prevMessages = trends ? kpis.messages    / (1 + trends.messages   / 100) : undefined
  const prevClicks   = trends ? kpis.linkClicks  / (1 + trends.linkClicks / 100) : undefined
  const prevReach    = trends ? kpis.reach       / (1 + trends.reach      / 100) : undefined

  const conversionValue =
    kpis.leads > 0 ? num(kpis.leads) : kpis.messages > 0 ? num(kpis.messages) : '—'
  const conversionLabel = kpis.leads > 0 ? 'Leads' : 'Mensagens'
  const conversionSubtitle =
    kpis.leads > 0
      ? `CPL: ${brl(kpis.costPerLead)}`
      : kpis.messages > 0
        ? `Custo/msg: ${brl(kpis.costPerMessage)}`
        : 'sem conversões no período'

  const conversionTrend = trends ? (kpis.leads > 0 ? trends.leads : trends.messages) : undefined
  const prevConversion = kpis.leads > 0
    ? (prevLeads !== undefined ? num(Math.round(prevLeads)) : undefined)
    : (prevMessages !== undefined ? num(Math.round(prevMessages)) : undefined)

  const items: KpiItem[] = [
    {
      label: 'Investimento',
      value: brl(kpis.spend),
      subtitle: `CPM: ${brl(kpis.cpm)}`,
      icon: DollarSign,
      color: 'blue',
      trend: trends?.spend,
      positiveIsGood: false,
      prevValue: prevSpend !== undefined ? brl(prevSpend) : undefined,
    },
    {
      label: conversionLabel,
      value: conversionValue,
      subtitle: conversionSubtitle,
      icon: UserCheck,
      color: 'orange',
      trend: conversionTrend,
      positiveIsGood: true,
      prevValue: prevConversion,
    },
    {
      label: 'Cliques no Link',
      value: num(kpis.linkClicks),
      subtitle: `CTR ${kpis.linkCtr.toFixed(2)}% · CPC ${brl(kpis.cpc)}`,
      icon: MousePointerClick,
      color: 'green',
      trend: trends?.linkClicks,
      positiveIsGood: true,
      prevValue: prevClicks !== undefined ? num(Math.round(prevClicks)) : undefined,
    },
    {
      label: 'Alcance',
      value: num(kpis.reach),
      subtitle: `${num(kpis.impressions)} impressões · freq. ${kpis.frequency.toFixed(2)}x`,
      icon: Eye,
      color: 'purple',
      trend: trends?.reach,
      positiveIsGood: true,
      prevValue: prevReach !== undefined ? num(Math.round(prevReach)) : undefined,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <KpiHighlightCard key={item.label} {...item} />
      ))}
    </div>
  )
}
