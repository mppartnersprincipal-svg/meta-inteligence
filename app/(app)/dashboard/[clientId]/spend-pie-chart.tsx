'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { CampaignRow } from '@/lib/meta-insights'

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'oklch(0.55 0.22 210)',
  'oklch(0.62 0.19 80)',
  'oklch(0.55 0.20 280)',
  'oklch(0.62 0.18 120)',
  'oklch(0.55 0.22 330)',
]

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

interface SpendPieChartProps {
  data: CampaignRow[]
}

export function SpendPieChart({ data }: SpendPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Sem campanhas no período
      </div>
    )
  }

  const totalSpend = data.reduce((s, d) => s + d.spend, 0)
  const chartData = data.map((row) => ({
    name: row.name.length > 28 ? row.name.slice(0, 28) + '…' : row.name,
    value: row.spend,
    pct: totalSpend > 0 ? ((row.spend / totalSpend) * 100).toFixed(1) : '0',
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          outerRadius={90}
          innerRadius={52}
          dataKey="value"
          stroke="none"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [formatBRL(value as number), 'Investimento']}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value, entry) => (
            <span className="text-xs text-muted-foreground">
              {value}{' '}
              <span className="font-semibold text-foreground">
                {(entry.payload as { pct?: string }).pct}%
              </span>
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
