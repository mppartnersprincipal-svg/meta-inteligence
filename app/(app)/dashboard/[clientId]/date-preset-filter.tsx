'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PRESETS = [
  { value: 'today',    label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_7d',  label: 'Últimos 7 dias' },
  { value: 'last_14d', label: 'Últimos 14 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
  { value: 'last_90d', label: 'Últimos 90 dias' },
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
    <Select value={current} onValueChange={setPreset}>
      <SelectTrigger className="w-44 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRESETS.map((p) => (
          <SelectItem key={p.value} value={p.value} className="text-xs">
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { parseDatePreset } from '@/lib/dashboard-params'
