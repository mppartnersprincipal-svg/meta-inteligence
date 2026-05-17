'use client'

import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { CampaignRow } from '@/lib/meta-insights'

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

interface CampaignBarChartProps {
  data: CampaignRow[]
  clientId: string
  accountId: string
}

type ChartEntry = CampaignRow & { shortName: string }

export function CampaignBarChart({ data, clientId, accountId }: CampaignBarChartProps) {
  const router = useRouter()

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Sem campanhas no período
      </div>
    )
  }

  const chartData: ChartEntry[] = [...data]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8)
    .map((row) => ({
      ...row,
      shortName: row.name.length > 26 ? row.name.slice(0, 26) + '…' : row.name,
    }))
    .reverse()

  const chartHeight = Math.max(220, chartData.length * 50)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
        barSize={24}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={148}
        />
        <Tooltip
          formatter={(value) => [formatBRL(value as number), 'Investimento']}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          cursor={{ fill: 'oklch(0 0 0 / 4%)' }}
        />
        <Bar
          dataKey="spend"
          radius={[0, 6, 6, 0]}
          cursor="pointer"
          onClick={(data) => {
            const entry = data as unknown as ChartEntry
            if (entry?.id && accountId) {
              router.push(`/dashboard/${clientId}/${accountId}/campaigns/${entry.id}`)
            }
          }}
        >
          {chartData.map((_, i) => (
            <Cell
              key={i}
              fill={CHART_COLORS[(chartData.length - 1 - i) % CHART_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
