'use client'

import type { LucideIcon } from 'lucide-react'

type Color = 'blue' | 'green' | 'purple' | 'orange' | 'teal'

const colorMap: Record<Color, { border: string; icon: string; text: string }> = {
  blue:   { border: 'border-l-[color:var(--chart-1)]', icon: 'bg-[color:var(--chart-1)]/15 text-[color:var(--chart-1)]', text: 'text-[color:var(--chart-1)]' },
  green:  { border: 'border-l-[color:var(--chart-2)]', icon: 'bg-[color:var(--chart-2)]/15 text-[color:var(--chart-2)]', text: 'text-[color:var(--chart-2)]' },
  purple: { border: 'border-l-[color:var(--chart-3)]', icon: 'bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)]', text: 'text-[color:var(--chart-3)]' },
  orange: { border: 'border-l-[color:var(--chart-4)]', icon: 'bg-[color:var(--chart-4)]/15 text-[color:var(--chart-4)]', text: 'text-[color:var(--chart-4)]' },
  teal:   { border: 'border-l-[color:var(--chart-5)]', icon: 'bg-[color:var(--chart-5)]/15 text-[color:var(--chart-5)]', text: 'text-[color:var(--chart-5)]' },
}

interface MetricCardProps {
  label: string
  value: string
  icon: LucideIcon
  color: Color
  subtitle?: string
}

export function MetricCard({ label, value, icon: Icon, color, subtitle }: MetricCardProps) {
  const c = colorMap[color]

  return (
    <div
      className={`
        relative flex flex-col gap-3 rounded-xl border bg-card p-4
        border-l-4 ${c.border}
        shadow-sm transition-shadow hover:shadow-md
      `}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-none">
          {label}
        </p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.icon}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

interface MetricSectionProps {
  title: string
  color: Color
  icon: LucideIcon
  metrics: { label: string; value: string; icon: LucideIcon; subtitle?: string }[]
}

export function MetricSection({ title, color, icon: SectionIcon, metrics }: MetricSectionProps) {
  const c = colorMap[color]
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${c.icon}`}>
          <SectionIcon className="h-3.5 w-3.5" />
        </span>
        <h2 className={`text-xs font-semibold uppercase tracking-widest ${c.text}`}>{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <MetricCard key={m.label} color={color} {...m} />
        ))}
      </div>
    </div>
  )
}
