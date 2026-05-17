'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
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

function formatBRLShort(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`
  return formatBRL(value)
}

interface ChartItem {
  name: string
  value: number
  pct: string
}

export function SpendPieChart({ data }: { data: CampaignRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Sem campanhas no período
      </div>
    )
  }

  const totalSpend = data.reduce((s, d) => s + d.spend, 0)
  const chartData: ChartItem[] = data.map((row) => ({
    name: row.name.length > 30 ? row.name.slice(0, 30) + '…' : row.name,
    value: row.spend,
    pct: totalSpend > 0 ? ((row.spend / totalSpend) * 100).toFixed(1) : '0',
  }))

  return (
    <div className="flex flex-col gap-4">
      {/* Pie chart with center label overlay */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={96}
              innerRadius={60}
              dataKey="value"
              stroke="none"
              paddingAngle={2}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, props) => [
                `${formatBRL(value as number)} (${(props.payload as ChartItem).pct}%)`,
                'Investimento',
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">total</p>
            <p className="text-sm font-bold tabular-nums mt-0.5">{formatBRLShort(totalSpend)}</p>
          </div>
        </div>
      </div>

      {/* Custom legend */}
      <div className="flex flex-col gap-1.5 px-1">
        {chartData.slice(0, 7).map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="truncate text-xs text-muted-foreground">{item.name}</span>
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums">{item.pct}%</span>
          </div>
        ))}
        {chartData.length > 7 && (
          <p className="text-xs text-muted-foreground pl-4">
            +{chartData.length - 7} outras campanhas
          </p>
        )}
      </div>
    </div>
  )
}
