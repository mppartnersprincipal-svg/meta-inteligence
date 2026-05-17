'use client'

interface MetricGaugeProps {
  value: number
  max: number
  label: string
  sublabel?: string
}

export function MetricGauge({ value, max, label, sublabel }: MetricGaugeProps) {
  const pct = Math.min(value / max, 1)
  const R = 80
  const circumference = Math.PI * R
  const filled = pct * circumference
  const gap = circumference - filled

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-full max-w-[200px]">
        <svg viewBox="0 0 200 110" className="w-full overflow-visible">
          {/* Background arc */}
          <path
            d={`M 20 100 A ${R} ${R} 0 0 1 180 100`}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d={`M 20 100 A ${R} ${R} 0 0 1 180 100`}
            fill="none"
            stroke="var(--chart-2)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${gap}`}
            style={{ filter: 'drop-shadow(0 0 6px rgba(146,255,183,0.5))' }}
          />
          {/* Value text */}
          <text
            x="100"
            y="92"
            textAnchor="middle"
            fontSize="22"
            fontWeight="700"
            fill="#e2e2e8"
            fontFamily="var(--font-hanken), sans-serif"
          >
            {value.toFixed(2)}%
          </text>
          {/* Label text */}
          <text
            x="100"
            y="110"
            textAnchor="middle"
            fontSize="10"
            fill="#bac9cd"
            fontFamily="var(--font-jetbrains), monospace"
            opacity={0.8}
          >
            {label}
          </text>
        </svg>
      </div>
      {sublabel && (
        <p
          className="text-[10px] text-muted-foreground text-center"
          style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
        >
          {sublabel}
        </p>
      )}
    </div>
  )
}
