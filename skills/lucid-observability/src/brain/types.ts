// ---------------------------------------------------------------------------
// brain/types.ts -- Brain result types for Lucid Observability
// ---------------------------------------------------------------------------

import type {
  Severity,
  TemporalPattern,
  DiagnosisCategory,
  SentryIssue,
  TriageResult,
  ReadinessResult,
  OutboxHealth,
  DiagnosisResult,
} from '../types/index.js';

// Re-export for convenience
export type {
  Severity,
  TemporalPattern,
  DiagnosisCategory,
  SentryIssue,
  TriageResult,
  ReadinessResult,
  OutboxHealth,
  DiagnosisResult,
};

// ---------------------------------------------------------------------------
// Analysis params
// ---------------------------------------------------------------------------

export interface TriageParams {
  issue: SentryIssue;
  timestamps?: number[];
}

export interface ReadinessParams {
  environment: 'production' | 'staging' | 'development';
  envVars: Record<string, string | undefined>;
}

export interface OutboxParams {
  pending: number;
  sent: number;
  deadLetter: number;
  leased: number;
  total: number;
  stuckLeases: number;
}

export interface DiagnoseParams {
  title: string;
  culprit?: string;
  stackTrace?: string;
}
