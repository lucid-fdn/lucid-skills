-- Lucid Prospect schema
CREATE TABLE IF NOT EXISTS prospect_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  company_name TEXT,
  company_domain TEXT,
  phone TEXT,
  linkedin_url TEXT,
  lead_source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'new',
  score INTEGER DEFAULT 0,
  icp_match_score INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  enrichment_data JSONB DEFAULT '{}',
  notes TEXT,
  campaign_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prospect_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  company_size TEXT,
  description TEXT,
  founded_year INTEGER,
  funding_total BIGINT DEFAULT 0,
  funding_stage TEXT,
  employee_count INTEGER,
  linkedin_url TEXT,
  website TEXT,
  technologies TEXT[] DEFAULT '{}',
  location TEXT,
  enrichment_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prospect_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  target_icp JSONB DEFAULT '{}',
  lead_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prospect_email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  provider TEXT,
  mx_found BOOLEAN,
  smtp_check BOOLEAN,
  is_catch_all BOOLEAN DEFAULT false,
  is_disposable BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prospect_enrichment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  provider TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prospect_leads_tenant ON prospect_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prospect_leads_email ON prospect_leads(email);
CREATE INDEX IF NOT EXISTS idx_prospect_leads_status ON prospect_leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_prospect_leads_score ON prospect_leads(tenant_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_leads_campaign ON prospect_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospect_companies_tenant ON prospect_companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prospect_companies_domain ON prospect_companies(domain);
CREATE INDEX IF NOT EXISTS idx_prospect_campaigns_tenant ON prospect_campaigns(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospect_email_verify ON prospect_email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_prospect_enrichment_entity ON prospect_enrichment_log(entity_type, entity_id);
