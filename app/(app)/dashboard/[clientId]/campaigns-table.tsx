'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { CampaignRow } from '@/lib/meta-insights'

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE'
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        fontFamily: 'var(--font-jetbrains), monospace',
        backgroundColor: isActive
          ? 'rgba(146, 255, 183, 0.12)'
          : 'rgba(255,255,255,0.06)',
        color: isActive ? 'var(--chart-2)' : '#bac9cd',
      }}
    >
      {isActive ? 'Ativo' : 'Pausado'}
    </span>
  )
}

interface CampaignsTableProps {
  data: CampaignRow[]
  clientId: string
  accountId: string
}

export function CampaignsTable({
  data,
  clientId,
  accountId,
}: CampaignsTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Sem campanhas no período
      </div>
    )
  }

  const maxSpend = Math.max(...data.map((d) => d.spend))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8">
            <th
              className="pb-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-medium"
              style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              Campanha
            </th>
            <th
              className="pb-2.5 text-right text-[10px] text-muted-foreground uppercase tracking-wider font-medium"
              style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              Investimento
            </th>
            <th
              className="pb-2.5 text-right text-[10px] text-muted-foreground uppercase tracking-wider font-medium"
              style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              Cliques
            </th>
            <th
              className="pb-2.5 text-right text-[10px] text-muted-foreground uppercase tracking-wider font-medium"
              style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              Leads
            </th>
            <th
              className="pb-2.5 text-right text-[10px] text-muted-foreground uppercase tracking-wider font-medium"
              style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              Msgs
            </th>
            <th className="pb-2.5 w-8" />
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const href =
              accountId && row.id
                ? `/dashboard/${clientId}/${accountId}/campaigns/${row.id}`
                : undefined
            const spendPct = maxSpend > 0 ? (row.spend / maxSpend) * 100 : 0

            return (
              <tr
                key={row.id || row.name}
                className={`group relative border-b border-white/[0.05] last:border-0 transition-colors ${
                  href ? 'hover:bg-white/[0.02]' : ''
                }`}
              >
                <td className="py-3 pr-4 max-w-[200px]">
                  {href && (
                    <Link
                      href={href}
                      className="absolute inset-0"
                      aria-label={row.name}
                    />
                  )}
                  <p
                    className="truncate font-medium text-foreground group-hover:text-primary transition-colors"
                    title={row.name}
                  >
                    {row.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1 w-20 rounded-full overflow-hidden bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[color:var(--chart-1)]"
                        style={{ width: `${spendPct}%`, opacity: 0.7 }}
                      />
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                </td>
                <td
                  className="py-3 text-right tabular-nums font-medium text-foreground"
                  style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
                >
                  {formatBRL(row.spend)}
                </td>
                <td
                  className="py-3 text-right tabular-nums text-muted-foreground"
                  style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
                >
                  {row.clicks.toLocaleString('pt-BR')}
                </td>
                <td
                  className="py-3 text-right tabular-nums text-foreground"
                  style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
                >
                  {row.leads > 0 ? row.leads.toLocaleString('pt-BR') : '—'}
                </td>
                <td
                  className="py-3 text-right tabular-nums text-foreground"
                  style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
                >
                  {row.messages > 0 ? row.messages.toLocaleString('pt-BR') : '—'}
                </td>
                <td className="py-3 text-right">
                  {href && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-20 group-hover:opacity-60 group-hover:text-primary transition-all" />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {data.some((r) => r.id && accountId) && (
        <p
          className="mt-2 text-[10px] text-muted-foreground"
          style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
        >
          Clique em uma campanha para ver detalhes
        </p>
      )}
    </div>
  )
}
