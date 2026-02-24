// ---------------------------------------------------------------------------
// database.ts -- Database row types
// ---------------------------------------------------------------------------

import type {
  AuditStatus,
  Chain,
  ContractType,
  FindingsCount,
  VulnerabilityCategory,
  VulnerabilitySeverity,
} from './common.js';

export interface Contract {
  id: string;
  tenant_id: string;
  address: string;
  chain: Chain;
  contract_type: ContractType;
  name: string | null;
  compiler_version: string | null;
  source_code: string | null;
  is_verified: boolean;
  is_proxy: boolean;
  implementation_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Audit {
  id: string;
  tenant_id: string;
  contract_id: string;
  status: AuditStatus;
  score: number | null;
  findings_count: FindingsCount | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vulnerability {
  id: string;
  tenant_id: string;
  audit_id: string;
  category: VulnerabilityCategory;
  severity: VulnerabilitySeverity;
  title: string;
  description: string;
  location: string;
  recommendation: string;
  is_false_positive: boolean;
  cwe_id: string | null;
  created_at: string;
}

export interface GasReport {
  id: string;
  tenant_id: string;
  audit_id: string;
  total_issues: number;
  estimated_savings: number;
  optimizations: GasOptimization[];
  summary: string;
  created_at: string;
}

export interface GasOptimization {
  location: string;
  description: string;
  estimated_savings: number;
  recommendation: string;
  category: string;
}

// Insert / Update helpers
export type ContractInsert = Omit<Contract, 'id' | 'created_at' | 'updated_at'>;
export type ContractUpdate = Partial<Omit<Contract, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>;

export type AuditInsert = Omit<Audit, 'id' | 'created_at' | 'updated_at'>;
export type AuditUpdate = Partial<Omit<Audit, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>;

export type VulnerabilityInsert = Omit<Vulnerability, 'id' | 'created_at'>;
export type VulnerabilityUpdate = Partial<Omit<Vulnerability, 'id' | 'tenant_id' | 'created_at'>>;

export type GasReportInsert = Omit<GasReport, 'id' | 'created_at'>;
