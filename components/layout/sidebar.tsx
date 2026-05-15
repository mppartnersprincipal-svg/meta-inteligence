'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  BarChart3,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
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
        'flex flex-col border-r border-border bg-sidebar transition-all duration-200',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4 border-b border-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <BarChart3 className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm leading-tight text-sidebar-foreground">
            Meta Ads<br />
            <span className="font-normal text-muted-foreground">Intelligence</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            'ml-auto flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
            collapsed && 'mx-auto'
          )}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
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
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>
      )}

      {/* Client list */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 && !collapsed && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
          </p>
        )}

        {filtered.map((client) => {
          const isActive = activeClientId === client.id
          const linkClass = cn(
            'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
            collapsed && 'justify-center px-2'
          )

          const linkContent = (
            <>
              <Avatar className="h-7 w-7 shrink-0">
                {client.logo_url && <AvatarImage src={client.logo_url} alt={client.name} />}
                <AvatarFallback className="text-[10px] font-semibold">
                  {clientInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && <span className="flex-1 truncate">{client.name}</span>}
            </>
          )

          return collapsed ? (
            <Tooltip key={client.id}>
              <TooltipTrigger render={<Link href={`/dashboard/${client.id}`} className={linkClass} />}>
                {linkContent}
              </TooltipTrigger>
              <TooltipContent side="right">{client.name}</TooltipContent>
            </Tooltip>
          ) : (
            <Link key={client.id} href={`/dashboard/${client.id}`} className={linkClass}>
              {linkContent}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Bottom actions */}
      <div className="flex flex-col gap-1 p-2">
        {collapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/settings/clients/new"
                    className="flex h-9 w-full items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
                    className="flex h-9 w-full items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
            <Link
              href="/settings/clients/new"
              className="flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo cliente
            </Link>
            <Link
              href="/settings/clients"
              className="flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Configurações
            </Link>
          </>
        )}
      </div>
    </aside>
  )
}
