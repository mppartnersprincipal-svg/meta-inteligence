'use client'

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
import type { DailySpend } from '@/lib/meta-insights'

function formatDate(dateStr: string) {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

export function SpendChart({ data, height = 200 }: { data: DailySpend[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Sem dados no período
      </div>
    )
  }

  const chartData = data.map((d) => ({ ...d, date: formatDate(d.date) }))
  const maxSpend = Math.max(...chartData.map((d) => d.spend))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip
          formatter={(value) => [formatBRL(value as number), 'Investimento']}
          labelStyle={{ fontWeight: 600 }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          cursor={{ fill: 'oklch(0 0 0 / 4%)' }}
        />
        <Bar dataKey="spend" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill="var(--chart-1)"
              fillOpacity={entry.spend === maxSpend ? 1 : 0.5}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
