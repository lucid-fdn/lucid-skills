// ---------------------------------------------------------------------------
// types/index.ts -- Core type definitions for Lucid Observability
// ---------------------------------------------------------------------------

/** Severity levels for issue triage */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** Temporal event patterns */
export type TemporalPattern = 'burst' | 'steady' | 'regression' | 'sporadic' | 'unknown';

/** Known diagnosis categories for error classification */
export type DiagnosisCategory =
  | 'litellm_timeout'
  | 'openmeter_timeout'
  | 'privy_auth'
  | 'mcp_server_down'
  | 'network_error'
  | 'timeout'
  | 'auth_error'
  | 'rate_limit'
  | 'database_error'
  | 'validation_error'
  | 'memory_leak'
  | 'application_error';

/** A Sentry issue to be triaged */
export interface SentryIssue {
  id: string;
  title: string;
  culprit?: string;
  level: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  isRegression?: boolean;
  tags?: Record<string, string>;
  stackTrace?: string;
}

/** Result of running full triage on an issue */
export interface TriageResult {
  severity: Severity;
  category: DiagnosisCategory;
  temporalPattern: TemporalPattern;
  confidence: number;
  matchedKeywords: string[];
  recommendation: string;
  runbookRef?: string;
  crossServiceAffected?: string[];
}

/** A single readiness check result */
export interface ReadinessCheck {
  variable: string;
  category: string;
  status: 'pass' | 'warn' | 'fail';
  value?: string;
  reason: string;
}

/** Overall production readiness result */
export interface ReadinessResult {
  score: number;
  isReady: boolean;
  checks: ReadinessCheck[];
  criticalFailures: string[];
  warnings: string[];
}

/** Outbox health analysis result */
export interface OutboxHealth {
  pending: number;
  sent: number;
  deadLetter: number;
  leased: number;
  total: number;
  stuckLeases: number;
  alerts: string[];
  isHealthy: boolean;
}

/** Diagnosis result from pattern matching */
export interface DiagnosisResult {
  category: DiagnosisCategory;
  confidence: number;
  matchedKeywords: string[];
  recommendation: string;
  runbook?: string;
}
