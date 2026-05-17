'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { DailySpend } from '@/lib/meta-insights'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

interface DayOfWeekChartProps {
  data: DailySpend[]
}

export function DayOfWeekChart({ data }: DayOfWeekChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-xs text-muted-foreground">
        Sem dados no período
      </div>
    )
  }

  // Group by day of week and compute average spend
  const sums: Record<number, number> = {}
  const counts: Record<number, number> = {}

  for (const { date, spend } of data) {
    // Append time to avoid UTC timezone offset issues
    const dow = new Date(`${date}T12:00:00`).getDay()
    sums[dow] = (sums[dow] ?? 0) + spend
    counts[dow] = (counts[dow] ?? 0) + 1
  }

  const chartData = DAY_LABELS.map((label, i) => ({
    day: label,
    avg: sums[i] ? sums[i] / counts[i] : 0,
  }))

  const maxAvg = Math.max(...chartData.map((d) => d.avg))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={20}>
        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(v) => [formatBRL(v as number), 'Média/dia']}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          cursor={{ fill: 'oklch(0 0 0 / 4%)' }}
        />
        <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill="var(--chart-1)"
              fillOpacity={entry.avg === maxAvg ? 1 : 0.4}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
