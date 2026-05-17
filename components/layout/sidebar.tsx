'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings,
  Sparkles,
  Zap,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Client } from '@/types'

interface SidebarProps {
  clients: Pick<Client, 'id' | 'name' | 'logo_url' | 'category'>[]
}

function clientInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function Sidebar({ clients }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const activeClientId = pathname.match(/\/dashboard\/([^/]+)/)?.[1]

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-white/5 transition-all duration-200',
        'bg-[#0c0e12] backdrop-blur-xl shadow-sm',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-white/5">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            'bg-[#baf2ff] shadow-[0_0_12px_rgba(0,218,248,0.4)]'
          )}
        >
          <Zap className="h-4 w-4 text-[#00363f]" />
        </div>

        {!collapsed && (
          <div className="leading-none">
            <h1
              className="text-[18px] font-bold tracking-tighter text-[#baf2ff]"
              style={{ fontFamily: 'var(--font-hanken), sans-serif' }}
            >
              CYBERADS
            </h1>
            <p
              className="text-[9px] text-muted-foreground uppercase tracking-[0.12em] mt-0.5"
              style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              Precision Intelligence
            </p>
          </div>
        )}

        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground',
            'hover:bg-primary/10 hover:text-primary transition-colors',
            collapsed ? 'mx-auto' : 'ml-auto'
          )}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'h-8 pl-8 text-xs',
                'bg-[#050505] border-white/10',
                'focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0',
                'placeholder:text-muted-foreground/60'
              )}
            />
          </div>
        </div>
      )}

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pb-2">
          <p
            className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.12em]"
            style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            Clientes
          </p>
        </div>
      )}

      {/* Client list */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 && !collapsed && (
          <p className="px-4 py-4 text-center text-xs text-muted-foreground">
            {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
          </p>
        )}

        {filtered.map((client) => {
          const isActive = activeClientId === client.id
          const linkClass = cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
            isActive
              ? 'bg-primary/5 text-primary font-semibold border-r-2 border-primary'
              : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
            collapsed && 'justify-center px-2'
          )

          const linkContent = (
            <>
              <Avatar className="h-6 w-6 shrink-0">
                {client.logo_url && (
                  <AvatarImage src={client.logo_url} alt={client.name} />
                )}
                <AvatarFallback
                  className={cn(
                    'text-[9px] font-semibold',
                    isActive
                      ? 'bg-primary/20 text-primary'
                      : 'bg-white/5 text-muted-foreground'
                  )}
                >
                  {clientInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span className="flex-1 truncate text-xs">{client.name}</span>
              )}
            </>
          )

          return collapsed ? (
            <Tooltip key={client.id}>
              <TooltipTrigger
                render={
                  <Link
                    href={`/dashboard/${client.id}`}
                    className={linkClass}
                  />
                }
              >
                {linkContent}
              </TooltipTrigger>
              <TooltipContent side="right">{client.name}</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              key={client.id}
              href={`/dashboard/${client.id}`}
              className={linkClass}
            >
              {linkContent}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div
        className={cn(
          'flex flex-col gap-1 border-t border-white/[0.06] p-2',
          !collapsed && 'gap-2 p-3'
        )}
      >
        {collapsed ? (
          <>
            {activeClientId && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href={`/dashboard/${activeClientId}/assistant`}
                      className={cn(
                        'flex h-9 w-full items-center justify-center rounded-lg transition-colors',
                        pathname.includes('/assistant')
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                      )}
                    />
                  }
                >
                  <Sparkles className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent side="right">Assistente IA</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/settings/clients/new"
                    className="flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  />
                }
              >
                <Plus className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="right">Novo cliente</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/settings/clients"
                    className="flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  />
                }
              >
                <Settings className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="right">Configurações</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            {activeClientId && (
              <Link
                href={`/dashboard/${activeClientId}/assistant`}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all duration-200',
                  pathname.includes('/assistant')
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>
                  Assistente IA
                </span>
              </Link>
            )}
            <Link
              href="/settings/clients/new"
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                'text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200'
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              <span style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>
                Novo cliente
              </span>
            </Link>
            <Link
              href="/settings/clients"
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                'text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200'
              )}
            >
              <Settings className="h-3.5 w-3.5" />
              <span style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>
                Configurações
              </span>
            </Link>
            <Link
              href="#"
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                'text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200'
              )}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>
                Suporte
              </span>
            </Link>
          </>
        )}
      </div>
    </aside>
  )
}
