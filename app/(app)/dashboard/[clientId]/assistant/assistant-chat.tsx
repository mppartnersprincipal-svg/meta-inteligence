'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Markdown } from '@/components/markdown'
import {
  FileDown,
  Loader2,
  RotateCcw,
  SendHorizonal,
  Sparkles,
  Wrench,
  User as UserIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type ModelKey = 'sonnet' | 'opus'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: string[]
}

interface AssistantChatProps {
  clientId: string
  clientName: string
  accountIds: string[]
}

const TOOL_LABELS: Record<string, string> = {
  get_client_overview: 'visão geral do cliente',
  get_client_campaigns: 'campanhas',
  compare_periods: 'comparação de períodos',
  get_campaign_detail: 'detalhe da campanha',
  get_campaign_ads: 'criativos da campanha',
  get_account_daily_spend: 'investimento diário',
}

const SUGGESTIONS = [
  'Faça um resumo da performance dos últimos 7 dias',
  'Como estamos vs período anterior?',
  'Quais campanhas devo pausar agora?',
  'Gere um relatório completo dos últimos 30 dias',
]

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function isReportContent(content: string): boolean {
  const headings = content.match(/^##\s+\S/gm)
  return (headings?.length ?? 0) >= 2
}

function buildReportHtml(innerHtml: string, clientName: string): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const safeName = clientName.replace(/[<>&]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;'
  )

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório · ${safeName} · ${dateStr}</title>
<style>
  @page { margin: 18mm 16mm; size: A4; }
  * { box-sizing: border-box; }
  html, body {
    background: #fff;
    color: #111827;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    margin: 0;
    padding: 0;
  }
  .report-header {
    border-bottom: 2px solid #0ea5b7;
    padding-bottom: 14px;
    margin-bottom: 22px;
  }
  .report-header .eyebrow {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 9pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #0ea5b7;
    margin: 0 0 6px;
  }
  .report-header h1 {
    font-size: 22pt;
    font-weight: 700;
    margin: 0 0 4px;
    color: #0f172a;
    letter-spacing: -0.01em;
  }
  .report-header .meta {
    font-size: 9pt;
    color: #6b7280;
    margin: 0;
  }
  .report-body h2 {
    font-size: 14pt;
    font-weight: 700;
    margin: 22px 0 10px;
    color: #0f172a;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 6px;
    page-break-after: avoid;
  }
  .report-body h3 {
    font-size: 11.5pt;
    font-weight: 600;
    margin: 16px 0 6px;
    color: #1f2937;
    page-break-after: avoid;
  }
  .report-body p { margin: 6px 0; }
  .report-body strong { color: #0f172a; font-weight: 600; }
  .report-body em { color: #4b5563; }
  .report-body ul, .report-body ol { padding-left: 22px; margin: 8px 0; }
  .report-body li { margin: 3px 0; }
  .report-body code {
    background: #f3f4f6;
    padding: 1px 5px;
    border-radius: 3px;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 9.5pt;
    color: #0f172a;
  }
  .report-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    page-break-inside: avoid;
    font-size: 10pt;
  }
  .report-body th, .report-body td {
    border: 1px solid #e5e7eb;
    padding: 7px 10px;
    text-align: left;
    vertical-align: top;
  }
  .report-body th {
    background: #f9fafb;
    font-weight: 600;
    color: #0f172a;
  }
  .report-body tr:nth-child(even) td { background: #fafafa; }
  .report-body blockquote {
    border-left: 3px solid #0ea5b7;
    padding: 4px 12px;
    margin: 10px 0;
    color: #4b5563;
    background: #f9fafb;
  }
  .report-footer {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 8.5pt;
    color: #9ca3af;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  @media print {
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <header class="report-header">
    <p class="eyebrow">Relatório de Tráfego Pago</p>
    <h1>${safeName}</h1>
    <p class="meta">Gerado em ${dateStr} · ${timeStr}</p>
  </header>
  <main class="report-body">${innerHtml}</main>
  <footer class="report-footer">Meta Ads Intelligence</footer>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`
}

function exportToPdf(sourceEl: HTMLElement | null, clientName: string) {
  if (!sourceEl) return
  const html = buildReportHtml(sourceEl.innerHTML, clientName)
  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) {
    alert('Não foi possível abrir a janela. Permita pop-ups para este site para exportar o PDF.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

export function AssistantChat({ clientId, clientName, accountIds }: AssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState<ModelKey>('sonnet')
  const [error, setError] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, activeTool])

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || loading) return

      setError(null)
      setLoading(true)

      const userMsg: ChatMessage = { id: uid(), role: 'user', content }
      const assistantMsg: ChatMessage = { id: uid(), role: 'assistant', content: '', toolsUsed: [] }
      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput('')

      const historyForApi = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      try {
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: historyForApi, clientId, model }),
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
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: m.content + delta } : m
                )
              )
            } else if (eventName === 'tool_start' && typeof data.name === 'string') {
              setActiveTool(data.name)
              const toolName = data.name
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, toolsUsed: [...(m.toolsUsed ?? []), toolName] }
                    : m
                )
              )
            } else if (eventName === 'tool_end') {
              setActiveTool(null)
            } else if (eventName === 'error') {
              throw new Error(typeof data.message === 'string' ? data.message : 'Erro no stream')
            } else if (eventName === 'done') {
              setActiveTool(null)
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        setError(msg)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id && m.content === ''
              ? { ...m, content: `_Não foi possível processar a resposta: ${msg}_` }
              : m
          )
        )
      } finally {
        setLoading(false)
        setActiveTool(null)
        inputRef.current?.focus()
      }
    },
    [loading, messages, clientId, model]
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  function reset() {
    if (loading) return
    setMessages([])
    setError(null)
    setActiveTool(null)
    inputRef.current?.focus()
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col gap-3">
      {/* Header com toggle de modelo + nova conversa */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#0c0e12] p-0.5">
            {(['sonnet', 'opus'] as ModelKey[]).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                disabled={loading}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors',
                  model === m
                    ? 'bg-primary text-[#00363f]'
                    : 'text-muted-foreground hover:text-foreground',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
                style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
              >
                {m === 'sonnet' ? 'Sonnet 4.6' : 'Opus 4.7'}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {accountIds.length} {accountIds.length === 1 ? 'conta vinculada' : 'contas vinculadas'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          disabled={loading || isEmpty}
          className="text-xs gap-1.5 h-8"
        >
          <RotateCcw className="h-3 w-3" />
          Nova conversa
        </Button>
      </div>

      {/* Lista de mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-white/5 bg-[#0a0c10]/40 p-4"
      >
        {isEmpty ? (
          <EmptyState clientName={clientName} onSuggestion={send} />
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} clientName={clientName} />
            ))}
            {loading && activeTool && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-10">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>
                  Consultando{' '}
                  <span className="text-primary">
                    {TOOL_LABELS[activeTool] ?? activeTool}
                  </span>
                  …
                </span>
              </div>
            )}
            {loading && !activeTool && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-10">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Pensando…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre métricas, peça análises ou relatórios…"
          rows={2}
          disabled={loading}
          className="resize-none bg-[#0c0e12] border-white/10 focus-visible:border-primary"
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-[60px] px-4 shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}

function MessageBubble({
  message,
  clientName,
}: {
  message: ChatMessage
  clientName: string
}) {
  const isUser = message.role === 'user'
  const markdownRef = useRef<HTMLDivElement>(null)
  const showPdfButton = !isUser && isReportContent(message.content)

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-[#00363f]' : 'bg-secondary/20 text-secondary'
        )}
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className={cn('flex flex-col gap-1 max-w-[85%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary/15 text-foreground'
              : 'glass-card border border-white/5 text-foreground'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div ref={markdownRef} className="markdown-body text-sm leading-relaxed">
              <Markdown>{message.content || '_…_'}</Markdown>
            </div>
          )}
        </div>
        {!isUser && (showPdfButton || (message.toolsUsed && message.toolsUsed.length > 0)) && (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            {message.toolsUsed?.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                <Wrench className="h-2.5 w-2.5" />
                {TOOL_LABELS[t] ?? t}
              </span>
            ))}
            {showPdfButton && (
              <button
                type="button"
                onClick={() => exportToPdf(markdownRef.current, clientName)}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20 hover:border-primary/50"
                style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
              >
                <FileDown className="h-3 w-3" />
                Baixar PDF
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  clientName,
  onSuggestion,
}: {
  clientName: string
  onSuggestion: (text: string) => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 py-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 shadow-[0_0_24px_rgba(0,218,248,0.25)]">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div className="text-center max-w-md">
        <h3
          className="text-xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-hanken), sans-serif' }}
        >
          Como posso ajudar com <span className="text-primary">{clientName}</span>?
        </h3>
        <p className="text-sm text-muted-foreground">
          Sou seu especialista em tráfego pago Meta. Faço análises profundas, identifico
          anomalias e recomendo otimizações com base nos dados reais das campanhas.
        </p>
      </div>
      <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="rounded-xl border border-white/5 bg-[#0c0e12] px-4 py-3 text-left text-xs text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
