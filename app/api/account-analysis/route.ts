import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { KPIs, KPITrends, CampaignRow, DailySpend } from '@/lib/meta-insights'

export const runtime = 'nodejs'
export const maxDuration = 60

const MODEL = 'claude-sonnet-4-6'

interface RequestBody {
  clientId: string
  accountId: string
  accountName: string
  preset: string
  kpis: KPIs
  trends?: KPITrends
  campaigns: CampaignRow[]
  dailySpend: DailySpend[]
}

const PRESET_LABEL: Record<string, string> = {
  today: 'hoje',
  yesterday: 'ontem',
  last_7d: 'últimos 7 dias',
  last_14d: 'últimos 14 dias',
  last_30d: 'últimos 30 dias',
  last_90d: 'últimos 90 dias',
}

function brl(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(v)
}

function fmtPct(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}%`
}

function buildAnalysisPrompt(body: RequestBody): string {
  const { kpis, trends, campaigns, dailySpend, accountName, preset } = body
  const periodLabel = PRESET_LABEL[preset] ?? preset

  const kpiBlock = [
    `Investimento: ${brl(kpis.spend)} (${fmtPct(trends?.spend)} vs período anterior)`,
    `Alcance: ${kpis.reach.toLocaleString('pt-BR')} pessoas (${fmtPct(trends?.reach)})`,
    `Impressões: ${kpis.impressions.toLocaleString('pt-BR')}`,
    `Frequência: ${kpis.frequency.toFixed(2)}x`,
    `CPM: ${brl(kpis.cpm)}`,
    `Cliques no link: ${kpis.linkClicks.toLocaleString('pt-BR')} (${fmtPct(trends?.linkClicks)})`,
    `CTR (link): ${kpis.linkCtr.toFixed(2)}%`,
    `CPC: ${brl(kpis.cpc)}`,
    `Leads: ${kpis.leads.toLocaleString('pt-BR')} (${fmtPct(trends?.leads)})`,
    `CPL: ${kpis.leads > 0 ? brl(kpis.costPerLead) : 'sem leads'}`,
    `Mensagens: ${kpis.messages.toLocaleString('pt-BR')} (${fmtPct(trends?.messages)})`,
    `Custo/msg: ${kpis.messages > 0 ? brl(kpis.costPerMessage) : 'sem mensagens'}`,
    `Engajamentos: ${kpis.postEngagements.toLocaleString('pt-BR')}`,
    `Reações: ${kpis.reactions} · Comentários: ${kpis.comments} · Compartilhamentos: ${kpis.shares}`,
  ].join('\n')

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const campaignBlock = campaigns.slice(0, 10).map((c, i) => {
    const pct = totalSpend > 0 ? ((c.spend / totalSpend) * 100).toFixed(1) : '0.0'
    const cpl = c.leads > 0 ? ` · CPL ${brl(c.spend / c.leads)}` : ''
    const cpm = c.messages > 0 ? ` · Custo/msg ${brl(c.spend / c.messages)}` : ''
    return `${i + 1}. ${c.name} — ${brl(c.spend)} (${pct}%) · ${c.clicks} cliques · ${c.leads} leads · ${c.messages} msgs${cpl}${cpm}`
  }).join('\n') || '(nenhuma campanha no período)'

  const dailyBlock = dailySpend.length > 0
    ? dailySpend.slice(-14).map((d) => `${d.date}: ${brl(d.spend)}`).join('\n')
    : '(sem dados diários)'

  return `Você está analisando a performance da conta de anúncios "${accountName}" no período ${periodLabel}.

# Métricas consolidadas
${kpiBlock}

# Top campanhas (por investimento)
${campaignBlock}

# Investimento diário (últimos pontos)
${dailyBlock}

---

Produza uma análise objetiva e direta para o gestor de tráfego, em **markdown**, com exatamente estas 3 seções (use ## como heading):

## Diagnóstico
2 a 3 frases curtas com a foto geral do período. O que está acontecendo? Está bom, ruim, estável?

## Pontos de Atenção
3 a 5 bullets com anomalias, riscos ou números fora do esperado. Cite valores concretos. Foque em:
- Frequência acima de 3 (saturação)
- CTR no link abaixo de 1% (criativo fraco)
- CPC alto sem conversão (problema de oferta/landing)
- CPL acima do razoável (não há benchmark fixo — compare entre campanhas)
- Concentração excessiva (>70% do gasto numa só campanha)
- Quedas bruscas vs período anterior

## Recomendações
3 a 5 bullets com ações específicas e nominais. Sempre cite nome de campanha quando aplicável. Exemplos:
- "Pausar campanha X — gastou R$ N e zero conversões"
- "Testar 3 criativos novos na campanha Y — frequência em 4,1x"
- "Realocar parte do gasto da campanha A para a B (CPL menor)"
- "Reduzir orçamento da campanha Z em 20% — performance estagnada"

# Regras
- **NUNCA** mencione ROAS, ROI, receita, vendas, valor de conversão — esse cliente roda apenas leads / mensagens / engajamento.
- Formato BRL: \`R$ 1.234,56\` (vírgula decimal).
- Números abreviados quando grandes: 12,3K · 1,5M
- Percentuais com 1 casa: 12,5%
- Direto e técnico. Sem floreios. Sem "estamos felizes em informar". Sem disclaimers.
- Cada bullet deve caber em 1 linha (no máximo 2).
- Responda **somente** as 3 seções em markdown. Sem introdução, sem conclusão.`
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY não configurada', { status: 500 })
  }

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return new Response('Body inválido', { status: 400 })
  }

  if (!body.clientId || !body.accountId || !body.kpis) {
    return new Response('Parâmetros obrigatórios faltando', { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Não autenticado', { status: 401 })

  const { data: bmToken } = await supabase
    .from('bm_tokens')
    .select('ad_account_ids, meta_tokens!inner(is_valid)')
    .eq('client_id', body.clientId)
    .single()

  const metaToken = bmToken
    ? (Array.isArray(bmToken.meta_tokens) ? bmToken.meta_tokens[0] : bmToken.meta_tokens)
    : null

  if (!metaToken?.is_valid) {
    return new Response('Cliente sem token Meta válido', { status: 403 })
  }
  if (!bmToken?.ad_account_ids?.includes(body.accountId)) {
    return new Response('Conta não pertence a este cliente', { status: 403 })
  }

  const anthropic = new Anthropic({ apiKey })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        const messageStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 1500,
          system:
            'Você é um especialista sênior em tráfego pago Meta (Facebook/Instagram Ads) para agências brasileiras. Analise dados e dê recomendações concretas em português brasileiro. Foco exclusivo em leads, mensagens e engajamento — nunca mencione ROAS, ROI ou receita.',
          messages: [
            { role: 'user', content: buildAnalysisPrompt(body) },
          ],
        })

        messageStream.on('text', (delta) => {
          send('text', { delta })
        })

        await messageStream.finalMessage()
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
