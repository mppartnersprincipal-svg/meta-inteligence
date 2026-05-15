import Link from 'next/link'
import { ChevronRight, LayoutDashboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface Props {
  children: React.ReactNode
  params: Promise<{ clientId: string }>
}

export default async function ClientDashboardLayout({ children, params }: Props) {
  const { clientId } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .single()

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <LayoutDashboard className="h-3.5 w-3.5" />
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        {client && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href={`/dashboard/${clientId}`}
              className="hover:text-foreground transition-colors font-medium text-foreground"
            >
              {client.name}
            </Link>
          </>
        )}
      </nav>
      {children}
    </div>
  )
}
