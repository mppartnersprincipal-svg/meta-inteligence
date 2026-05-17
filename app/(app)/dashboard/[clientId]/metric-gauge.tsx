'use client'

interface MetricGaugeProps {
  value: number
  max: number
  label: string
  sublabel?: string
}

export function MetricGauge({ value, max, label, sublabel }: MetricGaugeProps) {
  const pct = Math.min(value / max, 1)

  // Semicircle arc: radius=80, center=(100,100), starts at 180° ends at 0°
  // Arc length for a semicircle of radius 80 ≈ π*80 ≈ 251.3
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
            stroke="hsl(var(--muted))"
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
          />
          {/* Value text */}
          <text
            x="100"
            y="92"
            textAnchor="middle"
            fontSize="22"
            fontWeight="700"
            fill="currentColor"
          >
            {value.toFixed(2)}%
          </text>
          {/* Label text */}
          <text
            x="100"
            y="110"
            textAnchor="middle"
            fontSize="11"
            fill="currentColor"
            opacity={0.5}
          >
            {label}
          </text>
        </svg>
      </div>
      {sublabel && (
        <p className="text-[11px] text-muted-foreground text-center">{sublabel}</p>
      )}
    </div>
  )
}
