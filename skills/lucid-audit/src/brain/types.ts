// ---------------------------------------------------------------------------
// brain/types.ts -- Brain result types for Lucid Audit
// ---------------------------------------------------------------------------

import type { VulnerabilitySeverity } from '../core/types/common.js';

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

export type AuditVerdict = 'SAFE' | 'CAUTION' | 'RISKY' | 'CRITICAL';

// ---------------------------------------------------------------------------
// AuditResult -- the core brain output
// ---------------------------------------------------------------------------

export interface AuditResult {
  schemaVersion: 1;
  contract: {
    name: string;
    chain?: string;
    address?: string;
    solidityVersion?: string;
  };
  verdict: AuditVerdict;
  score: number; // 0-100
  grade: string; // A-F
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  topVulnerabilities: Array<{
    category: string;
    severity: VulnerabilitySeverity;
    title: string;
    location: string;
    recommendation: string;
  }>;
  gasAnalysis: {
    totalIssues: number;
    estimatedSavings: number;
    topOpportunities: Array<{
      title: string;
      savings: number;
      recommendation: string;
    }>;
  };
  riskFactors: string[];
  provenance: {
    tool: string;
    version: string;
    timestamp: string;
  };
}

// ---------------------------------------------------------------------------
// CompareResult -- diff two contract versions
// ---------------------------------------------------------------------------

export interface CompareResult {
  contractA: { name: string; score: number; grade: string };
  contractB: { name: string; score: number; grade: string };
  scoreDelta: number;
  fixedIssues: Array<{ title: string; severity: VulnerabilitySeverity }>;
  newIssues: Array<{ title: string; severity: VulnerabilitySeverity }>;
  persistentIssues: Array<{ title: string; severity: VulnerabilitySeverity }>;
  verdict: string;
}

// ---------------------------------------------------------------------------
// BatchScanResult -- scan multiple contracts
// ---------------------------------------------------------------------------

export interface BatchScanResult {
  contracts: Array<{
    name: string;
    score: number;
    grade: string;
    verdict: AuditVerdict;
    criticalCount: number;
  }>;
  avgScore: number;
  worstContract: string;
  totalFindings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

// ---------------------------------------------------------------------------
// GasResult -- focused gas analysis
// ---------------------------------------------------------------------------

export interface GasResult {
  schemaVersion: 1;
  totalIssues: number;
  estimatedSavings: number;
  issues: Array<{
    category: string;
    title: string;
    location: string;
    savings: number;
    recommendation: string;
  }>;
  summary: string;
  provenance: {
    tool: string;
    version: string;
    timestamp: string;
  };
}
