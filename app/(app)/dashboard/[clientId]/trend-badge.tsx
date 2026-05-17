import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendBadgeProps {
  value: number
  positiveIsGood?: boolean
}

export function TrendBadge({ value, positiveIsGood = true }: TrendBadgeProps) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" />
        0.0%
      </span>
    )
  }

  const isPositive = value > 0
  const isGood = isPositive ? positiveIsGood : !positiveIsGood
  const Icon = isPositive ? TrendingUp : TrendingDown
  const formatted = `${isPositive ? '+' : ''}${value.toFixed(1)}%`

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        isGood
          ? 'bg-[color:var(--chart-2)]/15 text-[color:var(--chart-2)]'
          : 'bg-destructive/12 text-destructive'
      }`}
    >
      <Icon className="h-3 w-3" />
      {formatted}
    </span>
  )
}
