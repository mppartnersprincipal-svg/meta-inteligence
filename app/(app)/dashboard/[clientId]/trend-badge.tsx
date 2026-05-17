import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendBadgeProps {
  value: number
  positiveIsGood?: boolean
}

export function TrendBadge({ value, positiveIsGood = true }: TrendBadgeProps) {
  if (value === 0) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        style={{
          fontFamily: 'var(--font-jetbrains), monospace',
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      >
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
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        fontFamily: 'var(--font-jetbrains), monospace',
        backgroundColor: isGood
          ? 'rgba(146, 255, 183, 0.12)'
          : 'rgba(255, 180, 171, 0.12)',
        color: isGood ? 'var(--chart-2)' : 'var(--chart-4)',
      }}
    >
      <Icon className="h-3 w-3" />
      {formatted}
    </span>
  )
}
