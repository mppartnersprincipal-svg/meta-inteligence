'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { BarChart2, Palette, TrendingUp } from 'lucide-react'

const TABS = [
  { value: 'gerais', label: 'Métricas Gerais', icon: BarChart2 },
  { value: 'criativos', label: 'Por Criativo', icon: Palette },
  { value: 'tempo', label: 'Por Tempo', icon: TrendingUp },
] as const

type Tab = (typeof TABS)[number]['value']

interface TabNavProps {
  current: Tab
}

export function TabNav({ current }: TabNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navigate = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 w-fit">
      {TABS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => navigate(value)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            current === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

export function parseTab(value: string | undefined | null): Tab {
  const valid: Tab[] = ['gerais', 'criativos', 'tempo']
  return valid.includes(value as Tab) ? (value as Tab) : 'gerais'
}
