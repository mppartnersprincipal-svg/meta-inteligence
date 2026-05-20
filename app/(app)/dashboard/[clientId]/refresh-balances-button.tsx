'use client'

import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { refreshClientBalances } from '@/app/actions/refresh-balances'

export function RefreshBalancesButton({ clientId }: { clientId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await refreshClientBalances(clientId)
        })
      }
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
      style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
      title="Buscar saldos atualizados da Meta agora"
    >
      <RefreshCw className={`h-3 w-3 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Atualizando…' : 'Atualizar'}
    </button>
  )
}
