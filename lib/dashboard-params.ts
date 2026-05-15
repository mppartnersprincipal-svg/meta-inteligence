const VALID_PRESETS = ['last_7d', 'last_14d', 'last_30d', 'last_90d'] as const
export type DatePreset = (typeof VALID_PRESETS)[number]

export function parseDatePreset(value: string | undefined | null): DatePreset {
  return VALID_PRESETS.includes(value as DatePreset) ? (value as DatePreset) : 'last_7d'
}

const VALID_TABS = ['gerais', 'criativos', 'tempo'] as const
export type Tab = (typeof VALID_TABS)[number]

export function parseTab(value: string | undefined | null): Tab {
  return VALID_TABS.includes(value as Tab) ? (value as Tab) : 'gerais'
}
