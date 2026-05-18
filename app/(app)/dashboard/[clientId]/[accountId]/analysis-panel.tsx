'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Markdown } from '@/components/markdown'
import { Sparkles, RefreshCw, AlertTriangle, Stethoscope, Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { KPIs, KPITrends, CampaignRow, DailySpend } from '@/lib/meta-insights'

interface AnalysisPanelProps {
  clientId: string
  accountId: string
  accountName: string
  preset: string
  kpis: KPIs
  trends?: KPITrends
  campaigns: CampaignRow[]
  dailySpend: DailySpend[]
}

interface Section {
  heading: string
  body: string
}

function parseSections(markdown: string): Section[] {
  if (!markdown.trim()) return []
  const lines = markdown.split('\n')
  const sections: Section[] = []
  let current: Section | null = null

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/)
    if (headingMatch) {
      if (current) sections.push(current)
      current = { heading: headingMatch[1].trim(), body: '' }
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line
    }
  }
  if (current) sections.push(current)
  return sections
}

function iconForHeading(heading: string) {
  const h = heading.toLowerCase()
  if (h.includes('diagn'))   return { Icon: Stethoscope, color: 'var(--chart-1)' }
  if (h.includes('aten') || h.includes('risco') || h.includes('alerta'))
    return { Icon: AlertTriangle, color: 'var(--chart-4)' }
  if (h.includes('recomen') || h.includes('aç'))
    return { Icon: Lightbulb, color: 'var(--chart-2)' }
  return { Icon: Sparkles, color: 'var(--chart-3)' }
}

export function AnalysisPanel(props: AnalysisPanelProps) {
  const { clientId, accountId, accountName, preset, kpis, trends, campaigns, dailySpend } = props

  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastKey = useRef<string>('')

  const requestKey = `${accountId}::${preset}`

  const generate = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)
    setContent('')

    try {
      const res = await fetch('/api/account-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          accountId,
          accountName,
          preset,
          kpis,
          trends,
          campaigns,
          dailySpend,
        }),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `Erro HTTP ${res.status}`)
      }
      if (!res.body) throw new Error('Sem corpo de resposta')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const raw of events) {
          const lines = raw.split('\n')
          let eventName = 'message'
          let dataStr = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim()
            else if (line.startsWith('data: ')) dataStr += line.slice(6)
          }
          if (!dataStr) continue
          let data: Record<string, unknown>
          try {
            data = JSON.parse(dataStr)
          } catch {
            continue
          }

          if (eventName === 'text' && typeof data.delta === 'string') {
            const delta = data.delta
            setContent((prev) => prev + delta)
          } else if (eventName === 'error') {
            throw new Error(typeof data.message === 'string' ? data.message : 'Erro')
          } else if (eventName === 'done') {
            setGeneratedAt(new Date())
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [clientId, accountId, accountName, preset, kpis, trends, campaigns, dailySpend])

  // Auto-gera ao montar e quando muda accountId/preset
  useEffect(() => {
    if (lastKey.current === requestKey) return
    lastKey.current = requestKey
    generate()
    return () => abortRef.current?.abort()
  }, [requestKey, generate])

  const sections = parseSections(content)
  const isEmpty = !loading && !error && sections.length === 0

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--chart-3) 12%, transparent)',
                color: 'var(--chart-3)',
                boxShadow: loading ? '0 0 20px color-mix(in srgb, var(--chart-3) 35%, transparent)' : undefined,
              }}
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Análise Inteligente
                {loading && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: 'color-mix(in srgb, var(--chart-3) 12%, transparent)',
                      color: 'var(--chart-3)',
                      fontFamily: 'var(--font-jetbrains), monospace',
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    gerando
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Diagnóstico, pontos de atenção e recomendações geradas a partir dos seus dados
                {generatedAt && !loading && (
                  <>
                    {' · atualizado '}
                    {generatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analisando…' : 'Atualizar'}
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            Não foi possível gerar a análise: {error}
          </div>
        )}

        {sections.length === 0 && loading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-32 rounded bg-white/10 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full rounded bg-white/[0.06] animate-pulse" />
                  <div className="h-2.5 w-[92%] rounded bg-white/[0.06] animate-pulse" />
                  <div className="h-2.5 w-[78%] rounded bg-white/[0.06] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isEmpty && (
          <p className="text-sm text-muted-foreground">
            Sem análise ainda. Clique em <span className="text-foreground">Atualizar</span> para gerar.
          </p>
        )}

        {sections.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-3">
            {sections.map((s, i) => {
              const { Icon, color } = iconForHeading(s.heading)
              return (
                <div
                  key={`${s.heading}-${i}`}
                  className="rounded-xl border border-white/5 bg-white/[0.015] p-4 transition-colors"
                  style={{
                    borderTopColor: color,
                    borderTopWidth: '2px',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md"
                      style={{
                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                        color,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <h4
                      className="text-[11px] font-bold uppercase tracking-[0.1em]"
                      style={{
                        color,
                        fontFamily: 'var(--font-jetbrains), monospace',
                      }}
                    >
                      {s.heading}
                    </h4>
                  </div>
                  <div className="markdown-body text-[13px] leading-relaxed text-foreground/90">
                    <Markdown>{s.body.trim() || '_…_'}</Markdown>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
