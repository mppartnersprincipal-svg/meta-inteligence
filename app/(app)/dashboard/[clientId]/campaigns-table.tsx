'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import type { CampaignRow } from '@/lib/meta-insights'

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface CampaignsTableProps {
  data: CampaignRow[]
  clientId: string
  accountId: string
}

export function CampaignsTable({ data, clientId, accountId }: CampaignsTableProps) {
  const router = useRouter()

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Sem campanhas no período
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="pb-2 text-left font-medium">Campanha</th>
            <th className="pb-2 text-right font-medium">Investimento</th>
            <th className="pb-2 text-right font-medium">Cliques</th>
            <th className="pb-2 text-right font-medium">Leads</th>
            <th className="pb-2 text-right font-medium">Msgs</th>
            <th className="pb-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const href =
              accountId && row.id
                ? `/dashboard/${clientId}/${accountId}/campaigns/${row.id}`
                : undefined

            return (
              <tr
                key={row.id || row.name}
                onClick={() => href && router.push(href)}
                className={`group border-b last:border-0 transition-colors ${
                  href ? 'cursor-pointer hover:bg-muted/50' : ''
                }`}
              >
                <td className="py-2.5 pr-4 max-w-[180px] truncate font-medium" title={row.name}>
                  {row.name}
                </td>
                <td className="py-2.5 text-right tabular-nums">{formatBRL(row.spend)}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {row.clicks.toLocaleString('pt-BR')}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {row.leads > 0 ? row.leads.toLocaleString('pt-BR') : '—'}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {row.messages > 0 ? row.messages.toLocaleString('pt-BR') : '—'}
                </td>
                <td className="py-2.5 text-right">
                  {href && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {data.some((r) => r.id && accountId) && (
        <p className="mt-2 text-xs text-muted-foreground">
          Clique em uma campanha para ver detalhes
        </p>
      )}
    </div>
  )
}
