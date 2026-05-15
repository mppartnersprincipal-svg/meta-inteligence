'use client'

import type { AdRow } from '@/lib/meta-insights'

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function pct(v: number) {
  return `${v.toFixed(2)}%`
}
function num(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString('pt-BR')
}

const MAX_SPEND_COLOR = 'var(--chart-1)'

interface CreativesTableProps {
  data: AdRow[]
}

export function CreativesTable({ data }: CreativesTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Sem criativos no período
      </div>
    )
  }

  const maxSpend = Math.max(...data.map((d) => d.spend))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs">
            <th className="pb-2.5 text-left font-medium">Criativo</th>
            <th className="pb-2.5 text-right font-medium">Investimento</th>
            <th className="pb-2.5 text-right font-medium">Impressões</th>
            <th className="pb-2.5 text-right font-medium">Cliques</th>
            <th className="pb-2.5 text-right font-medium">CTR</th>
            <th className="pb-2.5 text-right font-medium">CPC</th>
            <th className="pb-2.5 text-right font-medium">Leads</th>
            <th className="pb-2.5 text-right font-medium">Msgs</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const spendPct = maxSpend > 0 ? (row.spend / maxSpend) * 100 : 0
            return (
              <tr key={row.adId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-3 pr-4">
                  <div>
                    <p className="font-medium max-w-[220px] truncate" title={row.adName}>
                      {row.adName}
                    </p>
                    <div className="mt-1.5 h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${spendPct}%`,
                          backgroundColor: MAX_SPEND_COLOR,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3 text-right tabular-nums font-medium">{brl(row.spend)}</td>
                <td className="py-3 text-right tabular-nums text-muted-foreground">{num(row.impressions)}</td>
                <td className="py-3 text-right tabular-nums text-muted-foreground">{num(row.clicks)}</td>
                <td className="py-3 text-right tabular-nums">{pct(row.ctr)}</td>
                <td className="py-3 text-right tabular-nums">{row.cpc > 0 ? brl(row.cpc) : '—'}</td>
                <td className="py-3 text-right tabular-nums">
                  {row.leads > 0 ? num(row.leads) : '—'}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {row.messages > 0 ? num(row.messages) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
