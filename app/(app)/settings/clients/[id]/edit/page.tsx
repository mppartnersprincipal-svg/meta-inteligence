import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '../../client-form'
import { updateClientAction } from '@/app/actions/clients'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, logo_url, category, bm_tokens(id, bm_id, ad_account_ids)')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const token = Array.isArray(client.bm_tokens) ? client.bm_tokens[0] : null

  async function editAction(formData: FormData) {
    'use server'
    return updateClientAction(id, formData)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Editar cliente</h1>
        <p className="text-sm text-muted-foreground">
          Atualize as informações de <strong>{client.name}</strong>.
        </p>
      </div>
      <ClientForm
        action={editAction}
        submitLabel="Salvar alterações"
        defaultValues={{
          name: client.name,
          category: client.category,
          logo_url: client.logo_url ?? '',
          bm_id: token?.bm_id ?? '',
          ad_account_ids: token?.ad_account_ids.join(', ') ?? '',
        }}
        isEditing
      />
    </div>
  )
}
