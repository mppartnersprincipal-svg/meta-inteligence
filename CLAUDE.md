@AGENTS.md

# Meta Ads Intelligence — Contexto do Projeto

## O que é este projeto
Dashboard de inteligência de anúncios Meta (Facebook/Instagram) para agência de marketing. Permite gerenciar múltiplos clientes, conectar suas contas via token Meta e visualizar métricas de campanhas em tempo real.

## Stack
- **Framework**: Next.js 16.x com App Router e React Server Components
- **Auth & DB**: Supabase (PostgreSQL + RLS + Auth email/senha)
- **Estilo**: Tailwind CSS v4 + shadcn/ui (estilo base-nova, ícones lucide-react)
- **Gráficos**: recharts v3
- **Criptografia**: AES-256-GCM via Node.js `crypto` (módulo `lib/crypto.ts`)
- **API externa**: Meta Graph API v22.0
- **Tema**: next-themes (light / dark / system) — toggle na Topbar, classe `.dark` no `<html>`

## Variáveis de ambiente necessárias (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TOKEN_ENCRYPTION_KEY=   # 64 chars hex (32 bytes) — gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
META_API_VERSION=v22.0
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=      # chave Anthropic (sk-ant-...) para o assistente IA
```

## Banco de dados (Supabase)
Tabelas principais:
- `clients` — clientes da agência (id, name, category, logo_url)
- `bm_tokens` — tokens Meta por cliente (client_id, bm_id, ad_account_ids[], token_encrypted, is_valid, last_validated_at)

## Onboarding de cliente
Apenas o **token Meta** é necessário. O sistema chama automaticamente:
1. `/me?fields=id,name` — nome do usuário
2. `/me/adaccounts?fields=id&limit=200` — IDs das contas de anúncio (`act_XXXXXXXXX`) com paginação automática (até ~2200 contas)
3. `/me/businesses?fields=id,name` — Business Manager ID

Código: `lib/meta-api.ts` → `fetchMetaTokenInfo(token)`

## Estrutura de rotas do dashboard
```
/dashboard/[clientId]                                    ← visão consolidada do cliente
/dashboard/[clientId]/[accountId]                        ← métricas de uma conta específica
/dashboard/[clientId]/[accountId]/campaigns/[campaignId] ← detalhe de campanha (3 tabs)
/dashboard/[clientId]/assistant                          ← assistente IA especialista em tráfego pago
```

## Assistente IA (`/dashboard/[clientId]/assistant`)
Chat especializado em tráfego pago Meta com acesso real aos dados via tool use.

- **API route**: `app/api/assistant/route.ts` (POST, streaming SSE)
- **System prompt**: `lib/assistant/system-prompt.ts` (especialista PT-BR, foco em Lead Gen / Mensagens / Engajamento, sem ROAS)
- **Tools**: `lib/assistant/tools.ts` — reusam funções de `lib/meta-insights.ts`:
  - `get_client_overview`, `get_client_campaigns`, `compare_periods`
  - `get_campaign_detail`, `get_campaign_ads`, `get_account_daily_spend`
- **UI**: `assistant-chat.tsx` (Client Component) com markdown rendering, streaming token-a-token, toggle Sonnet 4.6 / Opus 4.7
- **Modelos**: `claude-sonnet-4-6` (padrão) e `claude-opus-4-7` (toggle UI)
- **Persistência**: efêmera (conversa vive na memória do React; refresh = nova conversa)
- Markdown stylesheet: `.markdown-body` em `app/globals.css`

### Filtro de período (URL search param)
`?preset=last_7d` | `last_14d` | `last_30d` | `last_90d`

Todas as páginas do dashboard aceitam o filtro, inclusive a visão consolidada do cliente.

### Tabs de campanha (URL search param)
`?tab=gerais` | `criativos` | `tempo`

## Layout das páginas de dashboard
As páginas `[clientId]` e `[clientId]/[accountId]` usam layout **2 colunas** em telas `xl+`:
- **Coluna principal** (esquerda): KpiHighlightRow, SpendChart, CampaignProgressBars, MetricSections
- **Sidebar** (direita, 300px): DayOfWeekChart, MetricGauge (CTR), SpendPieChart, CampaignBarChart

Em telas menores que `xl` (1280px) o layout colapsa para 1 coluna.

## Comparação de períodos (tendências)
Cada página busca em paralelo o período atual **e** o período anterior para calcular variação %:
- `getComparisonRanges(preset)` — calcula `{cur, prev}` com datas exatas em `lib/meta-insights.ts`
- `fetchKPIsForRange` / `fetchAccountKPIsForRange` — busca KPIs via `time_range` na Meta API
- `computeKPITrends(cur, prev)` — retorna `KPITrends` com `spend, leads, messages, linkClicks, reach` em %
- O `TrendBadge` exibe `+15.5%` (verde) ou `−10.0%` (vermelho) com contexto: spend subindo é ruim, leads subindo é bom

## Métricas exibidas
Organizadas em 4 seções coloridas (azul/verde/laranja/roxo):
1. **Alcance & Investimento** — spend, reach, impressions, frequency, CPM
2. **Cliques & Tráfego** — link clicks, total clicks, CTR, CPC
3. **Resultados** — leads, cost per lead, messages (WhatsApp/DM), cost per message
4. **Engajamento** — post engagements, reactions, comments, shares

## Lib utilitários
- `lib/meta-config.ts` — constante `GRAPH_API` compartilhada entre `meta-api.ts` e `meta-insights.ts`
- `lib/formatters.ts` — `brl(v)` (BRL currency) e `num(v)` (K/M abreviado)
- `lib/dashboard-sections.ts` — `buildSections(kpis: KPIs)` retorna as 4 seções de métricas
- `lib/dashboard-params.ts` — `parseDatePreset()` e `parseTab()` sem `'use client'` (usáveis em Server Components)
- `lib/crypto.ts` — AES-256-GCM encrypt/decrypt para tokens Meta

## Componentes-chave reutilizáveis

### Métricas e KPIs
- `metric-card.tsx` — `MetricCard` (barra de cor no topo, hover lift) e `MetricSection` (grid 5 colunas)
- `kpi-highlight-row.tsx` — 4 KPI cards grandes com `TrendBadge` e valor do período anterior
- `trend-badge.tsx` — badge `+X%` / `−X%` com cor e ícone contextual (`positiveIsGood` prop)

### Gráficos (todos `'use client'`, recharts)
- `spend-chart.tsx` — **column chart** (barras verticais) de investimento diário; dia máximo destacado
- `spend-pie-chart.tsx` — donut chart de distribuição por campanha com label central de total e legenda HTML customizada
- `campaign-bar-chart.tsx` — barras horizontais das top 8 campanhas, clicáveis para drill-down
- `day-of-week-chart.tsx` — barras por dia da semana (Dom–Sáb) calculadas do `dailySpend`; dia mais ativo destacado
- `metric-gauge.tsx` — arco SVG semicircular para CTR vs benchmark (ex.: 5%)

### Navegação e tabelas
- `campaign-progress-bars.tsx` — top 5 campanhas com barra proporcional ao spend e link de navegação (sem recharts)
- `campaigns-table.tsx` — tabela clicável com progress bar de spend e badge de status (Ativo/Pausado)
- `date-preset-filter.tsx` — filtro de período via URL search param
- `tab-nav.tsx` — navegação por tabs na página de campanha

### Layout
- `components/layout/sidebar.tsx` — sidebar colapsável com lista de clientes e busca
- `components/layout/topbar.tsx` — header com ThemeToggle, sino e menu do usuário
- `components/layout/theme-toggle.tsx` — dropdown Sun/Moon/Monitor usando `useTheme` do next-themes
- `components/providers.tsx` — `ThemeProvider` + `QueryClientProvider` + `TooltipProvider`

## Segurança
- Tokens Meta são sempre criptografados (AES-256-GCM) antes de salvar no banco
- Chamadas à Meta API usam header `Authorization: Bearer {token}` (não query param)
- Cache server-side de 5 minutos (`next: { revalidate: 300 }`) nas chamadas de insights
- HTTP status verificado em todas as chamadas à Meta API (incluindo `/me`) antes do `.json()`
- Rollback em cascata no `createClientAction`: falha no token → deleta client; falha no config → deleta token + client
- `updateClientAction` verifica erro no upsert de `bm_tokens` e retorna erro ao usuário se falhar

## Campanhas de foco (sem ROAS)
Clientes têm campanhas de: Geração de Leads, Mensagens (WhatsApp/DM) e Engajamento. Não há campanhas de vendas diretas, portanto ROAS não é relevante.
