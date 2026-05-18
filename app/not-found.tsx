import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Página não encontrada</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          O recurso que você procura não existe ou foi removido.
        </p>
      </div>
      <Button variant="default" nativeButton={false} render={<Link href="/dashboard" />}>
        Voltar ao dashboard
      </Button>
    </div>
  )
}
