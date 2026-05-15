# Meta Ads Intelligence — Architecture

## Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server Components for data fetching; Client Components for interactivity |
| UI | Tailwind CSS v4 + shadcn/ui | Accessible components, zero-config theming |
| Charts | Recharts | React-native, composable, no wrapper overhead vs Chart.js |
| Backend | Next.js API Routes + Server Actions | Serverless, no separate server; Server Actions keep form logic co-located |
| Database | Supabase (PostgreSQL) | Managed Postgres + Row Level Security + real-time potential |
| Auth | Supabase Auth | Integrated with DB, SSR-compatible via @supabase/ssr |
| Client cache | TanStack React Query | Auto-refetch every 5 min, stale-while-revalidate, Meta API rate limit respect |
| Token security | AES-256-GCM (Node.js crypto) | Tokens encrypted before INSERT; key stays server-side in env var |
| PDF export | puppeteer-core + @sparticuz/chromium | Serverless-compatible headless Chrome for faithful chart rendering (Fase 4) |

## Security model

- All Meta API calls happen exclusively in Next.js API Routes (server-side). The encrypted token is decrypted on the server, used for the Meta API call, and never returned to the client.
- Row Level Security ensures every DB query is automatically scoped to `auth.uid()`.
- `SUPABASE_SERVICE_ROLE_KEY` is only used server-side and never prefixed with `NEXT_PUBLIC_`.
- `TOKEN_ENCRYPTION_KEY` must be rotated if compromised — all tokens would need re-encryption.

## How to run

```bash
# 1. Copy and fill env vars
cp .env.local.example .env.local

# 2. Install dependencies
npm install

# 3. Apply DB schema (Supabase SQL Editor)
# Paste contents of supabase/migrations/001_initial_schema.sql

# 4. Start dev server
npm run dev
```

## Folder structure

```
app/
  (auth)/login/         # Public auth routes
  (app)/                # Protected app shell (sidebar + topbar)
    dashboard/          # Client dashboards
    settings/clients/   # Client CRUD
  actions/              # Server Actions
  api/meta/             # Meta API proxy routes (Fase 2)
  api/export/pdf/       # PDF generation route (Fase 4)
components/
  layout/               # Topbar, Sidebar
  ui/                   # shadcn/ui primitives
lib/
  supabase/             # Browser, server, and middleware clients
  crypto.ts             # AES-256-GCM token encrypt/decrypt
types/                  # Shared TypeScript interfaces
supabase/migrations/    # SQL schema files
```

## Ports

| Service | Port |
|---|---|
| Next.js dev | 3000 |
| Supabase local (optional) | 54321 |

## Estimated cost per operation (production)

| Operation | Cost driver | Notes |
|---|---|---|
| Dashboard load | Supabase reads | ~5 queries per client load, free tier covers thousands/day |
| Meta API insights | Meta rate limit | 200 calls/hour per token; React Query prevents duplicates |
| PDF generation | Vercel Function execution | ~5–15s, billed per invocation |
