-- Lucid Audit schema
-- Tables for smart contract security auditing

-- Contracts table
CREATE TABLE IF NOT EXISTS audit_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'custom',
  name TEXT,
  compiler_version TEXT,
  source_code TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_proxy BOOLEAN NOT NULL DEFAULT false,
  implementation_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, address, chain)
);

-- Audits table
CREATE TABLE IF NOT EXISTS audit_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  contract_id UUID NOT NULL REFERENCES audit_contracts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER,
  findings_count JSONB,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vulnerabilities table
CREATE TABLE IF NOT EXISTS audit_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  audit_id UUID NOT NULL REFERENCES audit_audits(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  is_false_positive BOOLEAN NOT NULL DEFAULT false,
  cwe_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gas reports table
CREATE TABLE IF NOT EXISTS audit_gas_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  audit_id UUID NOT NULL REFERENCES audit_audits(id) ON DELETE CASCADE,
  total_issues INTEGER NOT NULL DEFAULT 0,
  estimated_savings INTEGER NOT NULL DEFAULT 0,
  optimizations JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_contracts_tenant ON audit_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_contracts_address ON audit_contracts(tenant_id, address, chain);
CREATE INDEX IF NOT EXISTS idx_audit_audits_tenant ON audit_audits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_audits_contract ON audit_audits(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_vulnerabilities_audit ON audit_vulnerabilities(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_vulnerabilities_severity ON audit_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_audit_gas_reports_audit ON audit_gas_reports(audit_id);

-- RLS policies
ALTER TABLE audit_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_gas_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON audit_contracts
  USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY "Tenant isolation" ON audit_audits
  USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY "Tenant isolation" ON audit_vulnerabilities
  USING (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY "Tenant isolation" ON audit_gas_reports
  USING (tenant_id = current_setting('app.tenant_id', true));
