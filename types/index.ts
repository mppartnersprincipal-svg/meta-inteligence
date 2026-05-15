export type ClientCategory = 'ecommerce' | 'services' | 'saas' | 'local' | 'other'

export interface Client {
  id: string
  user_id: string
  name: string
  logo_url: string | null
  category: ClientCategory
  created_at: string
}

export interface BmToken {
  id: string
  client_id: string
  bm_id: string
  ad_account_ids: string[]
  is_valid: boolean
  last_validated_at: string | null
  created_at: string
}

export interface ClientConfig {
  id: string
  client_id: string
  alert_roas_threshold: number
  default_period: string
  color_theme: string
}

export interface ClientWithDetails extends Client {
  bm_tokens: BmToken[]
  client_config: ClientConfig | null
}

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7d'
  | 'last_30d'
  | 'this_month'
  | 'last_month'

export interface DateRange {
  from: Date
  to: Date
}
