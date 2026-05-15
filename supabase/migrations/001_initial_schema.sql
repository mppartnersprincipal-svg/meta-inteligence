-- Meta Ads Intelligence — Fase 1 Schema
-- Run this migration in the Supabase SQL Editor

-- ============================================================
-- clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL,
  logo_url    TEXT,
  category    TEXT        NOT NULL DEFAULT 'other'
                          CHECK (category IN ('ecommerce', 'services', 'saas', 'local', 'other')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- bm_tokens  (access token stored as AES-256-GCM ciphertext)
-- The plaintext token NEVER leaves the server — encryption is
-- performed in the Next.js API layer before INSERT.
-- ============================================================
CREATE TABLE IF NOT EXISTS bm_tokens (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID        REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  bm_id             TEXT        NOT NULL,
  token_encrypted   TEXT        NOT NULL,
  ad_account_ids    TEXT[]      NOT NULL DEFAULT '{}',
  is_valid          BOOLEAN     NOT NULL DEFAULT FALSE,
  last_validated_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- client_config
-- ============================================================
CREATE TABLE IF NOT EXISTS client_config (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID        REFERENCES clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  alert_roas_threshold  NUMERIC(10,2) NOT NULL DEFAULT 1.0,
  default_period        TEXT        NOT NULL DEFAULT 'last_7d',
  color_theme           TEXT        NOT NULL DEFAULT 'blue',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bm_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_config ENABLE ROW LEVEL SECURITY;

-- clients policies
CREATE POLICY "clients: select own"  ON clients FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "clients: insert own"  ON clients FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients: update own"  ON clients FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "clients: delete own"  ON clients FOR DELETE  USING (auth.uid() = user_id);

-- bm_tokens policies (scoped through client ownership)
CREATE POLICY "bm_tokens: select own" ON bm_tokens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = bm_tokens.client_id AND clients.user_id = auth.uid()
  ));

CREATE POLICY "bm_tokens: insert own" ON bm_tokens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = bm_tokens.client_id AND clients.user_id = auth.uid()
  ));

CREATE POLICY "bm_tokens: update own" ON bm_tokens FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = bm_tokens.client_id AND clients.user_id = auth.uid()
  ));

CREATE POLICY "bm_tokens: delete own" ON bm_tokens FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = bm_tokens.client_id AND clients.user_id = auth.uid()
  ));

-- client_config policies
CREATE POLICY "client_config: select own" ON client_config FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = client_config.client_id AND clients.user_id = auth.uid()
  ));

CREATE POLICY "client_config: insert own" ON client_config FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = client_config.client_id AND clients.user_id = auth.uid()
  ));

CREATE POLICY "client_config: update own" ON client_config FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = client_config.client_id AND clients.user_id = auth.uid()
  ));
