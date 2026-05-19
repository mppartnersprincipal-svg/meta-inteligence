'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/formatters'
import type { BalanceAlertWithClient } from '@/lib/balance-alerts'

const SEEN_STORAGE_KEY = 'mai:seen-balance-alerts'

function getSeen(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function persistSeen(seen: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    // Limita pra não crescer pra sempre.
    const arr = Array.from(seen).slice(-200)
    window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(arr))
  } catch {
    // localStorage cheio / desabilitado — não trava UI.
  }
}

interface Props {
  alerts: BalanceAlertWithClient[]
}

/**
 * Mostra toast pop-up para cada alerta novo (não visto ainda neste navegador).
 * Marca como "visto" em localStorage pra não repetir a cada navegação.
 */
export function BalanceAlertsToast({ alerts }: Props) {
  const router = useRouter()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    if (alerts.length === 0) return

    const seen = getSeen()
    const fresh = alerts.filter((a) => !seen.has(a.id))
    if (fresh.length === 0) return

    // Toast individual por alerta novo (até 5 — acima disso, resumo)
    if (fresh.length <= 5) {
      fresh.forEach((alert) => {
        toast.warning(`Saldo baixo: ${alert.account_name}`, {
          id: `balance-${alert.id}`,
          description: [
            alert.client_name,
            `${formatCurrency(alert.balance_minor_units, alert.currency)} (limite R$ 200,00)`,
          ]
            .filter(Boolean)
            .join(' · '),
          icon: <AlertTriangle className="h-4 w-4" />,
          duration: 10000,
          action: {
            label: 'Abrir conta',
            onClick: () => router.push(`/dashboard/${alert.client_id}/${alert.account_id}`),
          },
        })
      })
    } else {
      toast.warning(`${fresh.length} contas com saldo abaixo de R$ 200,00`, {
        id: 'balance-summary',
        description: 'Veja a lista no sino de notificações.',
        icon: <AlertTriangle className="h-4 w-4" />,
        duration: 10000,
      })
    }

    fresh.forEach((a) => seen.add(a.id))
    persistSeen(seen)
  }, [alerts, router])

  return null
}
