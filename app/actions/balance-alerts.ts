'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function dismissBalanceAlert(alertId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('account_balance_alerts')
    .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('status', 'unread')

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function dismissAllBalanceAlerts(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('account_balance_alerts')
    .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
    .eq('status', 'unread')

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}
