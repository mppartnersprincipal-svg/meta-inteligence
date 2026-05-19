'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, AlertTriangle, X, ExternalLink } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/formatters'
import type { BalanceAlertWithClient } from '@/lib/balance-alerts'
import { dismissBalanceAlert, dismissAllBalanceAlerts } from '@/app/actions/balance-alerts'

interface NotificationsBellProps {
  alerts: BalanceAlertWithClient[]
}

export function NotificationsBell({ alerts }: NotificationsBellProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const count = alerts.length
  const hasAlerts = count > 0

  function handleDismiss(id: string) {
    startTransition(async () => {
      await dismissBalanceAlert(id)
      router.refresh()
    })
  }

  function handleDismissAll() {
    startTransition(async () => {
      await dismissAllBalanceAlerts()
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={[
          'relative flex h-8 w-8 items-center justify-center rounded-lg outline-none',
          'text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200',
          'focus-visible:ring-1 focus-visible:ring-primary/50',
          hasAlerts ? 'text-destructive hover:text-destructive' : '',
        ].join(' ')}
        aria-label={hasAlerts ? `${count} notificações de saldo baixo` : 'Notificações'}
      >
        <Bell className="h-4 w-4" />
        {hasAlerts && (
          <span
            className={[
              'absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center',
              'rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground',
              'shadow-[0_0_0_2px_rgba(17,19,23,1)]',
            ].join(' ')}
            style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[340px] max-h-[480px] overflow-hidden flex flex-col bg-[#1e2024] border-white/10 p-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            <p
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              Notificações
            </p>
          </div>
          {hasAlerts && (
            <button
              onClick={handleDismissAll}
              disabled={isPending}
              className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              Marcar todas
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {!hasAlerts ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-3 rounded-full bg-muted/30 p-3">
                <Bell className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Você será avisado quando o saldo de uma conta cair abaixo de R$ 200,00.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {alerts.map((alert) => (
                <li key={alert.id} className="group relative">
                  <Link
                    href={`/dashboard/${alert.client_id}/${alert.account_id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-primary/5 transition-colors"
                  >
                    <div className="mt-0.5 shrink-0 rounded-full bg-destructive/15 p-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-semibold text-foreground truncate"
                        style={{ fontFamily: 'var(--font-hanken), sans-serif' }}
                      >
                        Saldo baixo: {alert.account_name}
                      </p>
                      {alert.client_name && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {alert.client_name}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span
                          className="text-sm font-bold text-destructive tabular-nums"
                          style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
                        >
                          {formatCurrency(alert.balance_minor_units, alert.currency)}
                        </span>
                        <span
                          className="text-[10px] text-muted-foreground"
                          style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
                        >
                          / limite R$ 200,00
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                        <ExternalLink className="h-2.5 w-2.5" />
                        Abrir conta
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDismiss(alert.id)
                    }}
                    disabled={isPending}
                    aria-label="Dispensar notificação"
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 hover:bg-muted/40 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasAlerts && (
          <div className="border-t border-white/10 px-4 py-2 bg-muted/10">
            <p
              className="text-[10px] text-muted-foreground/70 text-center"
              style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              Limite atual: R$ 200,00
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
