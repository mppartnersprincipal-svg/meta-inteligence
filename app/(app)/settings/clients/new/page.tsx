import { ClientForm } from '../client-form'
import { createClientAction } from '@/app/actions/clients'

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Novo cliente</h1>
        <p className="text-sm text-muted-foreground">
          Cole o token da Meta e os dados do cliente serão importados automaticamente.
        </p>
      </div>
      <ClientForm action={createClientAction} submitLabel="Criar cliente" />
    </div>
  )
}
