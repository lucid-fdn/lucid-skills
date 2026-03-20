// ---------------------------------------------------------------------------
// brain/analysis.ts -- Core triage engine
// ---------------------------------------------------------------------------

import { scoreSeverity } from '../math/severity.js';
import { detectTemporalPattern } from '../math/temporal.js';
import { diagnoseIssue } from '../math/diagnosis.js';
import type { SentryIssue, TriageResult } from '../types/index.js';

/**
 * Run full triage on a Sentry issue.
 * Combines severity scoring, temporal pattern detection, and diagnosis into
 * a single structured result.
 */
export function runTriage(issue: SentryIssue, timestamps?: number[]): TriageResult {
  // Step 1: Score severity
  const severity = scoreSeverity({
    level: issue.level,
    count: issue.count,
    userCount: issue.userCount,
    lastSeen: issue.lastSeen,
  });

  // Step 2: Detect temporal pattern
  const temporalPattern = timestamps ? detectTemporalPattern(timestamps) : 'unknown';

  // Step 3: Diagnose issue
  const diagnosis = diagnoseIssue(issue.title, issue.culprit, issue.stackTrace);

  // Step 4: Build recommendation based on severity
  const recommendation = buildRecommendation(severity, diagnosis.recommendation, temporalPattern);

  // Step 5: Detect potential cross-service impact from tags
  const crossServiceAffected = detectCrossServiceImpact(issue);

  return {
    severity,
    category: diagnosis.category,
    temporalPattern,
    confidence: diagnosis.confidence,
    matchedKeywords: diagnosis.matchedKeywords,
    recommendation,
    runbookRef: diagnosis.runbook,
    crossServiceAffected: crossServiceAffected.length > 0 ? crossServiceAffected : undefined,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRecommendation(
  severity: string,
  diagnosisRec: string,
  temporalPattern: string,
): string {
  const parts: string[] = [];

  // Severity-based action
  switch (severity) {
    case 'critical':
      parts.push('IMMEDIATE: Consider rollback, follow incident-response runbook.');
      break;
    case 'high':
      parts.push('URGENT: Check recent deployments, assign to on-call.');
      break;
    case 'medium':
      parts.push('Create investigation ticket, monitor 24h trend.');
      break;
    default:
      parts.push('Monitor. Auto-resolve if <5 occurrences/day for 3 days.');
  }

  // Pattern-based context
  switch (temporalPattern) {
    case 'burst':
      parts.push('Pattern is BURST — likely triggered by deployment or config change.');
      break;
    case 'steady':
      parts.push('Pattern is STEADY — systemic issue, not a one-time event.');
      break;
    case 'regression':
      parts.push('Pattern is REGRESSION — bug was fixed then reintroduced.');
      break;
    case 'sporadic':
      parts.push('Pattern is SPORADIC — look for specific trigger conditions.');
      break;
  }

  // Diagnosis recommendation
  parts.push(diagnosisRec);

  return parts.join(' ');
}

function detectCrossServiceImpact(issue: SentryIssue): string[] {
  const services: string[] = [];

  // If the issue has trace_id or run_id, it may affect multiple services
  if (issue.tags?.trace_id || issue.tags?.run_id) {
    // The issue has correlation IDs — flag that cross-service search is recommended
    services.push('Cross-service correlation available via trace_id/run_id');
  }

  // Check if the issue references known services in its title/culprit
  const searchText = [issue.title, issue.culprit ?? ''].join(' ').toLowerCase();
  const knownServices = ['lucid-web', 'lucid-worker', 'lucid-l2', 'trustgate', 'mcpgate'];
  for (const svc of knownServices) {
    if (searchText.includes(svc)) {
      services.push(svc);
    }
  }

  return services;
}
