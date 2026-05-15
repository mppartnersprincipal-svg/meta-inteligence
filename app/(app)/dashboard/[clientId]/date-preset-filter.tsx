'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const PRESETS = [
  { value: 'last_7d', label: '7 dias' },
  { value: 'last_14d', label: '14 dias' },
  { value: 'last_30d', label: '30 dias' },
  { value: 'last_90d', label: '90 dias' },
] as const

type Preset = (typeof PRESETS)[number]['value']

interface DatePresetFilterProps {
  current: Preset
}

export function DatePresetFilter({ current }: DatePresetFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setPreset = useCallback(
    (preset: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('preset', preset)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => setPreset(p.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            current === p.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

export function parseDatePreset(value: string | undefined | null): Preset {
  const valid: Preset[] = ['last_7d', 'last_14d', 'last_30d', 'last_90d']
  return valid.includes(value as Preset) ? (value as Preset) : 'last_7d'
}
