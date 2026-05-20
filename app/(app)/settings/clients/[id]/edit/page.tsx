import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditClientForm } from '../../edit-client-form'
import { listClientTokenAccountsAction } from '@/app/actions/clients'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, logo_url, category')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const accountsResult = await listClientTokenAccountsAction(id)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Editar cliente</h1>
        <p className="text-sm text-muted-foreground">
          Atualize as informações de <strong>{client.name}</strong>.
        </p>
      </div>
      <EditClientForm
        clientId={id}
        defaultValues={{
          name: client.name,
          category: client.category,
          logo_url: client.logo_url ?? '',
        }}
        accounts={accountsResult.ok ? accountsResult.accounts : null}
        linkedIds={accountsResult.ok ? accountsResult.linkedIds : []}
        accountsError={accountsResult.ok ? null : accountsResult.error}
      />
    </div>
  )
}
