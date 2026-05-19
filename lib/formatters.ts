export function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value)
}

export function num(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString('pt-BR')
}

// Currencies with 0 decimal places (no minor unit subdivision).
// Meta returns monetary fields like balance/amount_spent in minor units —
// e.g. BRL "100000" = R$ 1.000,00 but JPY "1000" = ¥1.000.
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG',
  'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
])

export function formatCurrency(minorUnits: number, currency: string): string {
  const decimals = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2
  const amount = minorUnits / Math.pow(10, decimals)
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      maximumFractionDigits: decimals,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(decimals)}`
  }
}
