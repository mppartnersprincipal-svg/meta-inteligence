import { NewClientForm } from '../new-client-form'

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Novo cliente</h1>
        <p className="text-sm text-muted-foreground">
          Cole o token da Meta e escolha quais contas pertencem a este cliente.
        </p>
      </div>
      <NewClientForm />
    </div>
  )
}
