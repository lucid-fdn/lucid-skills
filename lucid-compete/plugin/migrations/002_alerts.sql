-- ---------------------------------------------------------------------------
-- 002_alerts.sql -- Alert log table for @raijinlabs/compete
-- ---------------------------------------------------------------------------

CREATE TABLE alert_log (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  signal_id INTEGER REFERENCES signals(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
