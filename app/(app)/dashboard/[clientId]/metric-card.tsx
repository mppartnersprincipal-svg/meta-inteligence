import type { LucideIcon } from 'lucide-react'

type Color = 'blue' | 'green' | 'purple' | 'orange' | 'teal'

/* Maps semantic color names to CYBERADS CSS variables */
const colorMap: Record<
  Color,
  { border: string; icon: string; text: string; glow: string }
> = {
  blue: {
    border: 'border-t-[var(--chart-1)]',
    icon: 'bg-[color:var(--chart-1)]/10 text-[color:var(--chart-1)]',
    text: 'text-[color:var(--chart-1)]',
    glow: 'hover:shadow-[0_0_16px_rgba(0,224,255,0.3)] hover:border-[color:var(--chart-1)]/40',
  },
  green: {
    border: 'border-t-[var(--chart-2)]',
    icon: 'bg-[color:var(--chart-2)]/10 text-[color:var(--chart-2)]',
    text: 'text-[color:var(--chart-2)]',
    glow: 'hover:shadow-[0_0_16px_rgba(146,255,183,0.25)] hover:border-[color:var(--chart-2)]/40',
  },
  purple: {
    border: 'border-t-[var(--chart-3)]',
    icon: 'bg-[color:var(--chart-3)]/10 text-[color:var(--chart-3)]',
    text: 'text-[color:var(--chart-3)]',
    glow: 'hover:shadow-[0_0_16px_rgba(220,184,255,0.25)] hover:border-[color:var(--chart-3)]/40',
  },
  orange: {
    border: 'border-t-[var(--chart-4)]',
    icon: 'bg-[color:var(--chart-4)]/10 text-[color:var(--chart-4)]',
    text: 'text-[color:var(--chart-4)]',
    glow: 'hover:shadow-[0_0_16px_rgba(255,180,171,0.25)] hover:border-[color:var(--chart-4)]/40',
  },
  teal: {
    border: 'border-t-[var(--chart-5)]',
    icon: 'bg-[color:var(--chart-5)]/10 text-[color:var(--chart-5)]',
    text: 'text-[color:var(--chart-5)]',
    glow: 'hover:shadow-[0_0_16px_rgba(0,218,248,0.3)] hover:border-[color:var(--chart-5)]/40',
  },
}

interface MetricCardProps {
  label: string
  value: string
  icon: LucideIcon
  color: Color
  subtitle?: string
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: MetricCardProps) {
  const c = colorMap[color]
  return (
    <div
      className={[
        'relative overflow-hidden flex flex-col gap-3 rounded-xl p-5',
        'glass-card border-t-4 transition-all duration-300',
        c.border,
        c.glow,
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <p
          className="text-[11px] text-muted-foreground leading-snug pr-2 uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
        >
          {label}
        </p>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.icon}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div>
        <p
          className="text-2xl font-bold tabular-nums leading-none text-foreground"
          style={{ fontFamily: 'var(--font-hanken), sans-serif' }}
        >
          {value}
        </p>
        {subtitle && (
          <p
            className="mt-1.5 text-[10px] text-muted-foreground"
            style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            {subtitle}
          </p>
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

export function MetricSection({
  title,
  color,
  icon: SectionIcon,
  metrics,
}: MetricSectionProps) {
  const c = colorMap[color]
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md ${c.icon}`}
        >
          <SectionIcon className="h-3.5 w-3.5" />
        </span>
        <h3
          className={`text-[11px] font-bold uppercase tracking-[0.1em] ${c.text}`}
          style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
        >
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <MetricCard key={m.label} color={color} {...m} />
        ))}
      </div>
    </div>
  )
}
