import Link from 'next/link'
import { Plus, Pencil, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/server'
import { DeleteClientButton } from './delete-client-button'

const CATEGORY_LABELS: Record<string, string> = {
  ecommerce: 'E-commerce',
  services: 'Serviços',
  saas: 'SaaS',
  local: 'Local',
  other: 'Outro',
}

function clientInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, logo_url, category, created_at, bm_tokens(id, bm_id, is_valid)')
    .order('name')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas Business Managers e contas de anúncio.
          </p>
        </div>
        <Button render={<Link href="/settings/clients/new" />}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      {(!clients || clients.length === 0) ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </p>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/settings/clients/new" />}
          >
            Adicionar primeiro cliente
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>BM ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const token = Array.isArray(client.bm_tokens) ? client.bm_tokens[0] : null
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {client.logo_url && (
                            <AvatarImage src={client.logo_url} alt={client.name} />
                          )}
                          <AvatarFallback className="text-xs">
                            {clientInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORY_LABELS[client.category] ?? client.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {token?.bm_id ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {!token ? (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Sem BM
                        </span>
                      ) : token.is_valid ? (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Válido
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-amber-600">
                          <XCircle className="h-3.5 w-3.5" />
                          Não validado
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(client.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          render={<Link href={`/settings/clients/${client.id}/edit`} />}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <DeleteClientButton clientId={client.id} clientName={client.name} />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
