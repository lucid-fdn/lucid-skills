// ---------------------------------------------------------------------------
// common.ts -- Shared constants and lightweight types
// ---------------------------------------------------------------------------

export const VULNERABILITY_SEVERITIES = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
] as const;
export type VulnerabilitySeverity = (typeof VULNERABILITY_SEVERITIES)[number];

export const AUDIT_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'failed',
] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export const CONTRACT_TYPES = [
  'erc20',
  'erc721',
  'erc1155',
  'defi',
  'governance',
  'proxy',
  'custom',
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CHAINS = [
  'ethereum',
  'bsc',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
  'base',
] as const;
export type Chain = (typeof CHAINS)[number];

export const VULNERABILITY_CATEGORIES = [
  'reentrancy',
  'overflow',
  'access-control',
  'oracle-manipulation',
  'flash-loan',
  'front-running',
  'gas-optimization',
  'logic-error',
  'centralization',
  'unchecked-return',
] as const;
export type VulnerabilityCategory = (typeof VULNERABILITY_CATEGORIES)[number];

export type SecurityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface FindingsCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}
