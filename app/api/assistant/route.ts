import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'
import { buildSystemPrompt } from '@/lib/assistant/system-prompt'
import { assistantTools, executeToolCall, type ToolContext } from '@/lib/assistant/tools'

export const runtime = 'nodejs'
export const maxDuration = 60

const MODEL_MAP = {
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-7',
} as const

type ModelKey = keyof typeof MODEL_MAP

interface IncomingMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: IncomingMessage[]
  clientId: string
  model?: ModelKey
}

const MAX_TOOL_ITERATIONS = 6

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY não configurada no servidor', { status: 500 })
  }

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return new Response('Body inválido', { status: 400 })
  }

  if (!body.clientId || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response('clientId e messages são obrigatórios', { status: 400 })
  }

  const modelKey: ModelKey = body.model === 'opus' ? 'opus' : 'sonnet'
  const model = MODEL_MAP[modelKey]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Não autenticado', { status: 401 })

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, category')
    .eq('id', body.clientId)
    .single()

  if (!client) return new Response('Cliente não encontrado', { status: 404 })

  const { data: bmToken } = await supabase
    .from('bm_tokens')
    .select('token_encrypted, ad_account_ids, is_valid')
    .eq('client_id', body.clientId)
    .single()

  if (!bmToken?.is_valid || !bmToken.token_encrypted) {
    return new Response('Token Meta inválido ou expirado para este cliente', { status: 403 })
  }

  let token: string
  try {
    token = decryptToken(bmToken.token_encrypted)
  } catch {
    return new Response('Falha ao descriptografar token Meta', { status: 500 })
  }

  const toolCtx: ToolContext = {
    token,
    accountIds: bmToken.ad_account_ids ?? [],
  }

  const systemPrompt = buildSystemPrompt({
    clientName: client.name,
    category: client.category,
    accountIds: toolCtx.accountIds,
    currentDate: new Date().toISOString().slice(0, 10),
  })

  const anthropic = new Anthropic({ apiKey })

  const conversation: Anthropic.MessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      try {
        for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
          const messageStream = anthropic.messages.stream({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            tools: assistantTools,
            messages: conversation,
          })

          const toolUses: { id: string; name: string; input: Record<string, unknown> }[] = []
          const assistantBlocks: Anthropic.ContentBlock[] = []

          messageStream.on('text', (delta) => {
            send('text', { delta })
          })

          messageStream.on('contentBlock', (block) => {
            assistantBlocks.push(block)
            if (block.type === 'tool_use') {
              toolUses.push({
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              })
              send('tool_start', { name: block.name })
            }
          })

          const finalMessage = await messageStream.finalMessage()

          conversation.push({ role: 'assistant', content: assistantBlocks })

          if (finalMessage.stop_reason !== 'tool_use' || toolUses.length === 0) {
            break
          }

          const toolResults: Anthropic.ToolResultBlockParam[] = []
          for (const use of toolUses) {
            const result = await executeToolCall(use.name, use.input, toolCtx)
            send('tool_end', { name: use.name })
            toolResults.push({
              type: 'tool_result',
              tool_use_id: use.id,
              content: result,
            })
          }

          conversation.push({ role: 'user', content: toolResults })
        }

        send('done', {})
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        send('error', { message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
