import { DollarSign, UserCheck, MousePointerClick, Eye } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { KPIs, KPITrends } from '@/lib/meta-insights'
import { brl, num } from '@/lib/formatters'
import { TrendBadge } from './trend-badge'

type Color = 'blue' | 'green' | 'orange' | 'purple'

const colorStyle: Record<
  Color,
  { iconCls: string; topCls: string; glow: string }
> = {
  blue: {
    iconCls: 'bg-[color:var(--chart-1)]/10 text-[color:var(--chart-1)]',
    topCls: 'border-t-[var(--chart-1)]',
    glow: 'hover:shadow-[0_0_20px_rgba(0,224,255,0.3)]',
  },
  green: {
    iconCls: 'bg-[color:var(--chart-2)]/10 text-[color:var(--chart-2)]',
    topCls: 'border-t-[var(--chart-2)]',
    glow: 'hover:shadow-[0_0_20px_rgba(146,255,183,0.25)]',
  },
  orange: {
    iconCls: 'bg-[color:var(--chart-4)]/10 text-[color:var(--chart-4)]',
    topCls: 'border-t-[var(--chart-4)]',
    glow: 'hover:shadow-[0_0_20px_rgba(255,180,171,0.25)]',
  },
  purple: {
    iconCls: 'bg-[color:var(--chart-3)]/10 text-[color:var(--chart-3)]',
    topCls: 'border-t-[var(--chart-3)]',
    glow: 'hover:shadow-[0_0_20px_rgba(220,184,255,0.25)]',
  },
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

function KpiHighlightCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  positiveIsGood = true,
  prevValue,
}: KpiItem) {
  const s = colorStyle[color]
  return (
    <div
      className={[
        'glass-card rounded-xl p-6 border-t-4 transition-all duration-300',
        s.topCls,
        s.glow,
      ].join(' ')}
    >
      <div className="flex items-start justify-between mb-4">
        <p
          className="text-[11px] text-muted-foreground uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
        >
          {label}
        </p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.iconCls}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p
        className="text-3xl font-bold tabular-nums leading-none text-foreground"
        style={{ fontFamily: 'var(--font-hanken), sans-serif' }}
      >
        {value}
      </p>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {trend !== undefined && (
          <TrendBadge value={trend} positiveIsGood={positiveIsGood} />
        )}
        {prevValue && (
          <p
            className="text-[10px] text-muted-foreground"
            style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            vs. {prevValue} ant.
          </p>
        )}
      </div>
      <p
        className="mt-1.5 text-[10px] text-muted-foreground"
        style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
      >
        {subtitle}
      </p>
    </div>
  )
}

interface KpiHighlightRowProps {
  kpis: KPIs
  trends?: KPITrends
}

export function KpiHighlightRow({ kpis, trends }: KpiHighlightRowProps) {
  const prevSpend    = trends ? kpis.spend      / (1 + trends.spend      / 100) : undefined
  const prevLeads    = trends ? kpis.leads       / (1 + trends.leads      / 100) : undefined
  const prevMessages = trends ? kpis.messages    / (1 + trends.messages   / 100) : undefined
  const prevClicks   = trends ? kpis.linkClicks  / (1 + trends.linkClicks / 100) : undefined
  const prevReach    = trends ? kpis.reach       / (1 + trends.reach      / 100) : undefined

  const conversionValue =
    kpis.leads > 0 ? num(kpis.leads) : kpis.messages > 0 ? num(kpis.messages) : '—'
  const conversionLabel = kpis.leads > 0 ? 'Leads' : 'Conversas iniciadas'
  const conversionSubtitle =
    kpis.leads > 0
      ? `CPL: ${brl(kpis.costPerLead)}`
      : kpis.messages > 0
        ? `Custo/conversa: ${brl(kpis.costPerMessage)}`
        : 'sem conversões no período'

  const conversionTrend = trends
    ? kpis.leads > 0
      ? trends.leads
      : trends.messages
    : undefined
  const prevConversion =
    kpis.leads > 0
      ? prevLeads !== undefined
        ? num(Math.round(prevLeads))
        : undefined
      : prevMessages !== undefined
        ? num(Math.round(prevMessages))
        : undefined

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
      prevValue:
        prevClicks !== undefined ? num(Math.round(prevClicks)) : undefined,
    },
    {
      label: 'Alcance',
      value: num(kpis.reach),
      subtitle: `${num(kpis.impressions)} impressões · freq. ${kpis.frequency.toFixed(2)}x`,
      icon: Eye,
      color: 'purple',
      trend: trends?.reach,
      positiveIsGood: true,
      prevValue:
        prevReach !== undefined ? num(Math.round(prevReach)) : undefined,
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
