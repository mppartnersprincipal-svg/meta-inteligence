import Link from 'next/link'
import type { CampaignRow } from '@/lib/meta-insights'
import { brl } from '@/lib/formatters'

interface CampaignProgressBarsProps {
  data: CampaignRow[]
  clientId: string
  accountId: string
}

const BAR_COLORS = [
  'bg-[color:var(--chart-1)]',
  'bg-[color:var(--chart-2)]',
  'bg-[color:var(--chart-3)]',
  'bg-[color:var(--chart-4)]',
  'bg-[color:var(--chart-5)]',
]

const BAR_SHADOWS = [
  'shadow-[0_0_8px_rgba(0,224,255,0.4)]',
  'shadow-[0_0_8px_rgba(146,255,183,0.4)]',
  'shadow-[0_0_8px_rgba(220,184,255,0.4)]',
  'shadow-[0_0_8px_rgba(255,180,171,0.4)]',
  'shadow-[0_0_8px_rgba(0,218,248,0.4)]',
]

export function CampaignProgressBars({
  data,
  clientId,
  accountId,
}: CampaignProgressBarsProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Sem campanhas no período
      </div>
    )
  }

  const top5 = [...data].sort((a, b) => b.spend - a.spend).slice(0, 5)
  const maxSpend = top5[0]?.spend ?? 1

  return (
    <div className="flex flex-col gap-4">
      {top5.map((row, i) => {
        const pct = maxSpend > 0 ? (row.spend / maxSpend) * 100 : 0
        const href =
          row.id && accountId
            ? `/dashboard/${clientId}/${accountId}/campaigns/${row.id}`
            : undefined

        const content = (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p
                className="text-xs font-medium truncate max-w-[calc(100%-80px)] text-foreground"
                title={row.name}
              >
                {row.name.length > 32 ? row.name.slice(0, 32) + '…' : row.name}
              </p>
              <span
                className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground"
                style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
              >
                {brl(row.spend)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/5">
              <div
                className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} ${BAR_SHADOWS[i % BAR_SHADOWS.length]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )

        if (href) {
          return (
            <Link
              key={row.id}
              href={href}
              className="group block hover:opacity-80 transition-opacity"
            >
              {content}
            </Link>
          )
        }
        return <div key={row.name}>{content}</div>
      })}
    </div>
  )
}
