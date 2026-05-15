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

## Variáveis de ambiente necessárias (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TOKEN_ENCRYPTION_KEY=   # 64 chars hex (32 bytes) — gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
META_API_VERSION=v22.0
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Banco de dados (Supabase)
Tabelas principais:
- `clients` — clientes da agência (id, name, category, logo_url)
- `bm_tokens` — tokens Meta por cliente (client_id, bm_id, ad_account_ids[], token_encrypted, is_valid, last_validated_at)

## Onboarding de cliente
Apenas o **token Meta** é necessário. O sistema chama automaticamente:
1. `/me?fields=id,name` — nome do usuário
2. `/me/adaccounts?fields=id` — IDs das contas de anúncio (`act_XXXXXXXXX`)
3. `/me/businesses?fields=id,name` — Business Manager ID

Código: `lib/meta-api.ts` → `fetchMetaTokenInfo(token)`

## Estrutura de rotas do dashboard
```
/dashboard/[clientId]                                    ← visão consolidada do cliente
/dashboard/[clientId]/[accountId]                        ← métricas de uma conta específica
/dashboard/[clientId]/[accountId]/campaigns/[campaignId] ← detalhe de campanha (3 tabs)
```

### Filtro de período (URL search param)
`?preset=last_7d` | `last_14d` | `last_30d` | `last_90d`

### Tabs de campanha (URL search param)
`?tab=gerais` | `criativos` | `tempo`

## Métricas exibidas
Organizadas em 4 seções coloridas (azul/verde/laranja/roxo):
1. **Alcance & Investimento** — spend, reach, impressions, frequency, CPM
2. **Cliques & Tráfego** — link clicks, total clicks, CTR, CPC
3. **Resultados** — leads, cost per lead, messages (WhatsApp/DM), cost per message
4. **Engajamento** — post engagements, reactions, comments, shares

## Componentes-chave reutilizáveis
- `app/(app)/dashboard/[clientId]/metric-card.tsx` — `MetricCard` e `MetricSection` com cor semântica
- `app/(app)/dashboard/[clientId]/date-preset-filter.tsx` — filtro de período via URL
- `app/(app)/dashboard/[clientId]/spend-pie-chart.tsx` — gráfico de pizza de investimento por campanha
- `app/(app)/dashboard/[clientId]/spend-chart.tsx` — gráfico de área de investimento diário
- `app/(app)/dashboard/[clientId]/campaigns-table.tsx` — tabela clicável de campanhas

## Segurança
- Tokens Meta são sempre criptografados (AES-256-GCM) antes de salvar no banco
- Chamadas à Meta API usam header `Authorization: Bearer {token}` (não query param)
- Cache server-side de 5 minutos (`next: { revalidate: 300 }`) nas chamadas de insights

## Campanhas de foco (sem ROAS)
Clientes têm campanhas de: Geração de Leads, Mensagens (WhatsApp/DM) e Engajamento. Não há campanhas de vendas diretas, portanto ROAS não é relevante.
