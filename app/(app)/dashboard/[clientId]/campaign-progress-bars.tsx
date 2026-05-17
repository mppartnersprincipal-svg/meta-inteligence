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

export function CampaignProgressBars({ data, clientId, accountId }: CampaignProgressBarsProps) {
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
    <div className="flex flex-col gap-3">
      {top5.map((row, i) => {
        const pct = maxSpend > 0 ? (row.spend / maxSpend) * 100 : 0
        const href =
          row.id && accountId
            ? `/dashboard/${clientId}/${accountId}/campaigns/${row.id}`
            : undefined

        const content = (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate max-w-[calc(100%-80px)]" title={row.name}>
                {row.name.length > 32 ? row.name.slice(0, 32) + '…' : row.name}
              </p>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                {brl(row.spend)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} opacity-80`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )

        if (href) {
          return (
            <Link key={row.id} href={href} className="group block hover:opacity-80 transition-opacity">
              {content}
            </Link>
          )
        }
        return <div key={row.name}>{content}</div>
      })}
    </div>
  )
}
