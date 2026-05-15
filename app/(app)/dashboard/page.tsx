import Link from 'next/link'
import { BarChart3, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id').limit(1)
  const hasClients = (clients?.length ?? 0) > 0

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <BarChart3 className="h-8 w-8 text-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">
            {hasClients ? 'Selecione um cliente' : 'Comece adicionando um cliente'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasClients
              ? 'Clique em um cliente na sidebar para ver o dashboard de métricas.'
              : 'Adicione sua primeira Business Manager para começar a monitorar as métricas.'}
          </p>
        </div>
        {!hasClients && (
          <Button render={<Link href="/settings/clients/new" />}>
            <Plus className="h-4 w-4" />
            Adicionar cliente
          </Button>
        )}
      </div>
    </div>
  )
}
