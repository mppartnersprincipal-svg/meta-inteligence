'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { updateClientAction } from '@/app/actions/clients'
import type { MetaAdAccount } from '@/lib/meta-api'

const CATEGORIES = [
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'services', label: 'Serviços' },
  { value: 'saas', label: 'SaaS' },
  { value: 'local', label: 'Negócio Local' },
  { value: 'other', label: 'Outro' },
]

const ACCOUNT_STATUS_LABEL: Record<number, string> = {
  1: 'Ativa',
  2: 'Desativada',
  3: 'Não confirmada',
  7: 'Em revisão',
  8: 'Em moderação',
  9: 'Reprovada',
  100: 'Encerrada',
  101: 'Não cadastrada',
  102: 'Em revisão',
}

interface Props {
  clientId: string
  defaultValues: { name: string; category: string; logo_url: string }
  accounts: MetaAdAccount[] | null
  linkedIds: string[]
  accountsError: string | null
}

export function EditClientForm({ clientId, defaultValues, accounts, linkedIds, accountsError }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)

  const [name, setName] = useState(defaultValues.name)
  const [category, setCategory] = useState(defaultValues.category)
  const [logoUrl, setLogoUrl] = useState(defaultValues.logo_url)
  const [selected, setSelected] = useState<Set<string>>(new Set(linkedIds))
  const [accountFilter, setAccountFilter] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    fd.set('name', name)
    fd.set('category', category)
    fd.set('logo_url', logoUrl)
    // Reset & re-add selected ids (FormData from the form may include unchecked too if there are hidden inputs)
    fd.delete('ad_account_ids')
    for (const id of selected) fd.append('ad_account_ids', id)

    try {
      const result = await updateClientAction(clientId, fd)
      if (result?.error) setError(result.error)
    } catch {
      // redirect throws
    } finally {
      setLoading(false)
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredAccounts = (accounts ?? []).filter((a) => {
    if (!accountFilter) return true
    const q = accountFilter.toLowerCase()
    return a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
  })

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do cliente</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={(v) => { if (v) setCategory(v) }}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="logo_url">URL do logo</Label>
            <Input
              id="logo_url"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://exemplo.com/logo.png"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Contas de anúncio vinculadas
            {accounts && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {selected.size}/{accounts.length} selecionadas
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Marque apenas as contas que pertencem a este cliente. Desmarcar uma conta a libera para
            outro cliente — os dados históricos não são apagados.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {accountsError && (
            <Alert variant="destructive">
              <AlertDescription>{accountsError}</AlertDescription>
            </Alert>
          )}

          {!accounts || accounts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {accountsError
                ? 'Forneça um novo token abaixo para listar as contas disponíveis.'
                : 'Nenhuma conta disponível neste token.'}
            </p>
          ) : (
            <>
              {accounts.length > 8 && (
                <Input
                  type="search"
                  placeholder="Filtrar por nome ou ID..."
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                />
              )}

              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSelected(new Set(filteredAccounts.map((a) => a.id)))}
                  className="text-primary hover:underline"
                >
                  Selecionar visíveis
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Limpar
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {filteredAccounts.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground text-center">
                    Nenhuma conta encontrada.
                  </p>
                ) : filteredAccounts.map((a) => {
                  const checked = selected.has(a.id)
                  return (
                    <label
                      key={a.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary cursor-pointer"
                        checked={checked}
                        onChange={() => toggle(a.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {a.id}
                          {a.businessName ? ` · ${a.businessName}` : ''}
                          {a.currency ? ` · ${a.currency}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {ACCOUNT_STATUS_LABEL[a.accountStatus] ?? `status ${a.accountStatus}`}
                      </span>
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atualizar token</CardTitle>
          <CardDescription>
            Opcional. Forneça um novo token para re-sincronizar a lista de contas disponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="token">
              Novo token{' '}
              <span className="text-muted-foreground font-normal">(deixe vazio para manter)</span>
            </Label>
            <div className="relative">
              <Input
                id="token"
                name="token"
                type={showToken ? 'text' : 'password'}
                placeholder="EAAxxxxxxxx..."
                className="font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" nativeButton={false} render={<Link href="/settings/clients" />}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}
