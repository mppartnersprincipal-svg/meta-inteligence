import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, logo_url, category')
    .order('name')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar clients={clients ?? []} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar user={user} />
        <main className="flex-1 overflow-auto p-6 bg-background">{children}</main>
      </div>
    </div>
  )
}
