'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Força refresh dos saldos das contas de anúncio.
 * Invalida o cache do fetch (`account-info` tag) e revalida o path do dashboard
 * para o usuário ver o número novo na próxima navegação/Server Action retorno.
 */
export async function refreshClientBalances(clientId: string): Promise<{ error?: string }> {
  if (!clientId) return { error: 'clientId obrigatório' }

  // Verifica que o cliente pertence ao usuário logado (RLS) antes de revalidar.
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Cliente não encontrado' }

  // Invalida cache de todas as contas (tag global é simples e barato).
  // updateTag tem expiração imediata — read-your-own-writes nesta Server Action.
  updateTag('account-info')
  // Força re-render das páginas do cliente.
  revalidatePath(`/dashboard/${clientId}`, 'layout')
  return {}
}
