'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
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
import {
  validateTokenAction,
  createClientAction,
  type ValidateTokenResult,
} from '@/app/actions/clients'

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

export function NewClientForm() {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)

  const [token, setToken] = useState('')
  const [tokenInfo, setTokenInfo] = useState<ValidateTokenResult | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [accountFilter, setAccountFilter] = useState('')

  async function handleValidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await validateTokenAction(token)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setTokenInfo(result)
      // Pré-preenche nome com businessName ou userName como sugestão
      setName(result.businessName ?? result.userName ?? '')
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (selected.size === 0) {
      setError('Selecione ao menos uma conta de anúncio.')
      return
    }
    setLoading(true)

    const fd = new FormData()
    fd.set('token', token)
    fd.set('name', name)
    fd.set('category', category)
    for (const id of selected) fd.append('ad_account_ids', id)

    try {
      const result = await createClientAction(fd)
      if (result?.error) setError(result.error)
    } catch {
      // Redirect after success throws — esperado
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

  // ----------------- Passo 1: token -----------------
  if (step === 1 || !tokenInfo) {
    return (
      <form onSubmit={handleValidate} className="flex flex-col gap-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Token de acesso</CardTitle>
            <CardDescription>
              Cole o token permanente da Meta. No próximo passo você escolhe quais contas pertencem a este cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="token">Token permanente *</Label>
              <div className="relative">
                <Input
                  id="token"
                  name="token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="EAAxxxxxxxx..."
                  required
                  className="font-mono pr-10"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
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
              <p className="text-xs text-muted-foreground">
                O token é criptografado com AES-256-GCM antes de ser armazenado.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" nativeButton={false} render={<Link href="/settings/clients" />}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !token}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Validar token
          </Button>
        </div>
      </form>
    )
  }

  // ----------------- Passo 2: dados do cliente + contas -----------------
  const filteredAccounts = tokenInfo.accounts.filter((a) => {
    if (!accountFilter) return true
    const q = accountFilter.toLowerCase()
    return a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
  })

  return (
    <form onSubmit={handleCreate} className="flex flex-col gap-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <button
        type="button"
        onClick={() => { setStep(1); setError(null); }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3 w-3" />
        Trocar token
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Dados do cliente</CardTitle>
          <CardDescription>
            Token validado para <strong>{tokenInfo.userName}</strong>
            {tokenInfo.businessName ? <> · BM <strong>{tokenInfo.businessName}</strong></> : null}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome do cliente *</Label>
            <Input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pacheco Solar"
            />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            3. Contas de anúncio
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {selected.size}/{tokenInfo.accounts.length} selecionadas
            </span>
          </CardTitle>
          <CardDescription>
            Marque apenas as contas que pertencem a este cliente. As demais ficam livres para serem
            vinculadas a outros clientes mais tarde.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {tokenInfo.accounts.length > 8 && (
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
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" nativeButton={false} render={<Link href="/settings/clients" />}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || selected.size === 0 || !name}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar cliente
        </Button>
      </div>
    </form>
  )
}
