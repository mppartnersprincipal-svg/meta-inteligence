import { notFound } from 'next/navigation'
import { Sparkles, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AssistantChat } from './assistant-chat'

interface Props {
  params: Promise<{ clientId: string }>
}

export default async function AssistantPage({ params }: Props) {
  const { clientId } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const { data: bmToken } = await supabase
    .from('bm_tokens')
    .select('ad_account_ids, meta_tokens!inner(is_valid)')
    .eq('client_id', clientId)
    .single()

  const metaToken = bmToken
    ? (Array.isArray(bmToken.meta_tokens) ? bmToken.meta_tokens[0] : bmToken.meta_tokens)
    : null

  const tokenOk = Boolean(metaToken?.is_valid)
  const accountIds: string[] = bmToken?.ad_account_ids ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground -mt-4">
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Assistente IA
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-hanken), sans-serif' }}>
          Assistente de IA <span className="text-muted-foreground">·</span>{' '}
          <span className="text-primary">{client.name}</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Especialista em tráfego pago Meta. Análises com dados em tempo real das suas campanhas.
        </p>
      </div>

      {!tokenOk || accountIds.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
          <p className="text-sm text-amber-200">
            Este cliente não tem token Meta válido ou contas vinculadas.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Configure o token em <span className="font-mono">Configurações &gt; Clientes</span> para
            ativar o assistente.
          </p>
        </div>
      ) : (
        <AssistantChat
          clientId={clientId}
          clientName={client.name}
          accountIds={accountIds}
        />
      )}
    </div>
  )
}
