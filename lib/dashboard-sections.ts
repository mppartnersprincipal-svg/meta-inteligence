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
} from 'lucide-react'
import type { KPIs } from './meta-insights'
import { brl, num } from './formatters'

export function buildSections(kpis: KPIs) {
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
        { label: 'Conversas iniciadas', value: kpis.messages > 0 ? num(kpis.messages) : '—', icon: MessageCircle },
        { label: 'Custo por conversa', value: kpis.costPerMessage > 0 ? brl(kpis.costPerMessage) : '—', icon: CreditCard },
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
