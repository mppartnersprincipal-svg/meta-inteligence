export type ClientCategory = 'ecommerce' | 'services' | 'saas' | 'local' | 'other'

export interface Client {
  id: string
  user_id: string
  name: string
  logo_url: string | null
  category: ClientCategory
  created_at: string
}

export interface MetaToken {
  id: string
  user_id: string
  meta_user_id: string | null
  meta_user_name: string | null
  business_id: string | null
  business_name: string | null
  is_valid: boolean
  last_validated_at: string | null
  created_at: string
}

export interface BmToken {
  id: string
  client_id: string
  meta_token_id: string
  ad_account_ids: string[]
  created_at: string
  meta_tokens?: MetaToken | null
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
