'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app error boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Algo deu errado</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {error.message || 'Não foi possível carregar esta página. Tente novamente.'}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mt-2">ref: {error.digest}</p>
        )}
      </div>
      <Button onClick={reset} variant="default">
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </Button>
    </div>
  )
}
