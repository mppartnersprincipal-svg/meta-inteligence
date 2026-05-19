-- Meta Ads Intelligence — Fase 2
-- Alertas in-app quando o saldo de uma conta de anúncios cai abaixo de um limite.
-- A detecção roda server-side a cada page load do dashboard.

CREATE TABLE IF NOT EXISTS account_balance_alerts (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              UUID        REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  account_id             TEXT        NOT NULL,
  account_name           TEXT        NOT NULL,
  balance_minor_units    BIGINT      NOT NULL,
  currency               TEXT        NOT NULL,
  threshold_minor_units  BIGINT      NOT NULL,
  status                 TEXT        NOT NULL DEFAULT 'unread'
                                     CHECK (status IN ('unread', 'dismissed', 'resolved')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dismissed_at           TIMESTAMPTZ
);

-- Apenas um alerta ativo por (client, conta). Reabre se for resolvido/descartado.
CREATE UNIQUE INDEX IF NOT EXISTS account_balance_alerts_unique_unread
  ON account_balance_alerts (client_id, account_id)
  WHERE status = 'unread';

CREATE INDEX IF NOT EXISTS account_balance_alerts_status_created_idx
  ON account_balance_alerts (status, created_at DESC);

ALTER TABLE account_balance_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_balance_alerts: select own" ON account_balance_alerts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = account_balance_alerts.client_id AND clients.user_id = auth.uid()
  ));

CREATE POLICY "account_balance_alerts: insert own" ON account_balance_alerts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = account_balance_alerts.client_id AND clients.user_id = auth.uid()
  ));

CREATE POLICY "account_balance_alerts: update own" ON account_balance_alerts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = account_balance_alerts.client_id AND clients.user_id = auth.uid()
  ));

CREATE POLICY "account_balance_alerts: delete own" ON account_balance_alerts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = account_balance_alerts.client_id AND clients.user_id = auth.uid()
  ));
