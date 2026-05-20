-- Meta Ads Intelligence — Fase 3
-- Separa o token Meta da relação cliente↔contas.
-- Antes: bm_tokens guardava (client_id, token_encrypted, ad_account_ids[])
--        → o token vazava TODAS as contas do perfil pessoal para 1 cliente
-- Depois: meta_tokens (user_id, token_encrypted, ...) 1:N bm_tokens (client_id, meta_token_id, ad_account_ids[])
--        → o mesmo token pode alimentar vários clientes, cada um com seu subconjunto

-- pgcrypto fornece digest() para o backfill de token_hash
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- meta_tokens — token Meta por usuário da agência
-- ============================================================
CREATE TABLE IF NOT EXISTS meta_tokens (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token_encrypted   TEXT        NOT NULL,
  token_hash        TEXT        NOT NULL,
  meta_user_id      TEXT,
  meta_user_name    TEXT,
  business_id       TEXT,
  business_name     TEXT,
  is_valid          BOOLEAN     NOT NULL DEFAULT FALSE,
  last_validated_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meta_tokens_user_hash_idx
  ON meta_tokens (user_id, token_hash);

ALTER TABLE meta_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_tokens: select own" ON meta_tokens FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "meta_tokens: insert own" ON meta_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meta_tokens: update own" ON meta_tokens FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "meta_tokens: delete own" ON meta_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- bm_tokens: adiciona FK e remove campos migrados para meta_tokens
-- ============================================================
ALTER TABLE bm_tokens
  ADD COLUMN IF NOT EXISTS meta_token_id UUID REFERENCES meta_tokens(id) ON DELETE CASCADE;

-- Backfill: cria 1 meta_tokens por bm_tokens existente, copiando token + status.
-- token_hash usa hash do ciphertext (não dedupica linhas antigas, mas isso é OK —
-- a dedup futura acontece em app-level no INSERT, usando hash do plaintext).
INSERT INTO meta_tokens (
  id, user_id, token_encrypted, token_hash, business_id, is_valid, last_validated_at, created_at
)
SELECT
  gen_random_uuid(),
  c.user_id,
  bt.token_encrypted,
  encode(digest(bt.token_encrypted, 'sha256'), 'hex'),
  bt.bm_id,
  bt.is_valid,
  bt.last_validated_at,
  bt.created_at
FROM bm_tokens bt
JOIN clients c ON c.id = bt.client_id
WHERE bt.meta_token_id IS NULL;

-- Liga cada bm_tokens à meta_tokens recém-criada (match por user_id + token_encrypted)
UPDATE bm_tokens bt
SET meta_token_id = mt.id
FROM clients c, meta_tokens mt
WHERE bt.client_id = c.id
  AND mt.user_id = c.user_id
  AND mt.token_encrypted = bt.token_encrypted
  AND bt.meta_token_id IS NULL;

-- Após backfill, meta_token_id passa a ser obrigatório
ALTER TABLE bm_tokens
  ALTER COLUMN meta_token_id SET NOT NULL;

-- Remove colunas migradas
ALTER TABLE bm_tokens
  DROP COLUMN IF EXISTS token_encrypted,
  DROP COLUMN IF EXISTS bm_id,
  DROP COLUMN IF EXISTS is_valid,
  DROP COLUMN IF EXISTS last_validated_at;
