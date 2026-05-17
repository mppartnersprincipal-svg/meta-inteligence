'use client'

import { useRouter } from 'next/navigation'
import { Bell, LogOut, Settings } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface TopbarProps {
  user: SupabaseUser
}

function userInitials(email: string): string {
  return email.slice(0, 2).toUpperCase()
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleSettings() {
    router.push('/settings/clients')
  }

  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-white/5"
      style={{
        backgroundColor: 'rgba(17, 19, 23, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-4">
        <h2
          className="font-bold text-lg text-foreground"
          style={{ fontFamily: 'var(--font-hanken), sans-serif' }}
        >
          Intelligence Suite
        </h2>
        <span className="h-4 w-px bg-white/10" />
        <span
          className="text-xs text-muted-foreground"
          style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
        >
          Selecione um cliente na sidebar
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <button
          className={[
            'relative flex h-8 w-8 items-center justify-center rounded-lg',
            'text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200',
          ].join(' ')}
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-1 focus-visible:ring-primary/50">
            <Avatar
              className={[
                'h-8 w-8 border border-white/10',
                'ring-2 ring-transparent hover:ring-primary/30 transition-all duration-200',
              ].join(' ')}
            >
              <AvatarFallback
                className="text-xs font-semibold bg-primary/10 text-primary"
                style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
              >
                {userInitials(user.email ?? 'US')}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-52 bg-[#1e2024] border-white/10"
          >
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium truncate text-muted-foreground">
                {user.email}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={handleSettings}
              className="gap-2 cursor-pointer hover:bg-primary/10 hover:text-primary"
            >
              <Settings className="h-3.5 w-3.5" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="gap-2 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
              data-variant="destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
