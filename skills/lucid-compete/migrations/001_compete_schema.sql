-- ---------------------------------------------------------------------------
-- 001_compete_schema.sql -- Core tables for @raijinlabs/compete
-- ---------------------------------------------------------------------------

-- Competitors
CREATE TABLE competitors (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, website)
);

-- Monitors
CREATE TABLE monitors (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  monitor_type TEXT NOT NULL,
  url TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  last_fetched_at TIMESTAMPTZ,
  last_content_hash TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, competitor_id, monitor_type, url)
);

-- Signals
CREATE TABLE signals (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  url TEXT,
  metadata JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fts TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED
);

CREATE INDEX signals_fts_idx ON signals USING GIN(fts);
CREATE INDEX signals_competitor_idx ON signals(competitor_id, detected_at DESC);
CREATE INDEX signals_severity_idx ON signals(severity, detected_at DESC);

-- Battlecards
CREATE TABLE battlecards (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  markdown TEXT NOT NULL,
  html TEXT,
  signal_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Briefs
CREATE TABLE briefs (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  brief_type TEXT NOT NULL DEFAULT 'weekly',
  date DATE NOT NULL,
  title TEXT,
  markdown TEXT NOT NULL,
  html TEXT,
  signal_count INTEGER DEFAULT 0,
  competitor_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date, brief_type)
);
