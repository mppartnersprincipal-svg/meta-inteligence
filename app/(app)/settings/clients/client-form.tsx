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

const CATEGORIES = [
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'services', label: 'Serviços' },
  { value: 'saas', label: 'SaaS' },
  { value: 'local', label: 'Negócio Local' },
  { value: 'other', label: 'Outro' },
]

interface DefaultValues {
  name?: string
  category?: string
  logo_url?: string
}

interface ClientFormProps {
  action: (formData: FormData) => Promise<{ error: string } | undefined | void>
  submitLabel: string
  defaultValues?: DefaultValues
  isEditing?: boolean
}

export function ClientForm({ action, submitLabel, defaultValues, isEditing }: ClientFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [category, setCategory] = useState(defaultValues?.category ?? 'other')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('category', category)

    try {
      const result = await action(formData)
      if (result?.error) setError(result.error)
    } catch {
      // Redirect after success throws — expected
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* --- CRIAÇÃO: token + categoria apenas --- */}
      {!isEditing && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Token de acesso</CardTitle>
              <CardDescription>
                Cole o token permanente da Meta. Nome, Business Manager e contas de anúncio serão
                importados automaticamente.
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={category}
                  onValueChange={(v) => { if (v) setCategory(v) }}
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="category" value={category} />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* --- EDIÇÃO: campos manuais + token opcional para re-sincronizar --- */}
      {isEditing && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações do cliente</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={defaultValues?.name}
                  placeholder="Ex: Loja do João"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={category}
                  onValueChange={(v) => { if (v) setCategory(v) }}
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="category" value={category} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="logo_url">URL do logo</Label>
                <Input
                  id="logo_url"
                  name="logo_url"
                  type="url"
                  defaultValue={defaultValues?.logo_url}
                  placeholder="https://exemplo.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atualizar token</CardTitle>
              <CardDescription>
                Opcional. Ao fornecer um novo token, o Business Manager e as contas de anúncio serão
                re-sincronizados automaticamente via Meta API.
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
        </>
      )}

      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" nativeButton={false} render={<Link href="/settings/clients" />}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
