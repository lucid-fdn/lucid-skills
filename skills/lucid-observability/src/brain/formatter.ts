// ---------------------------------------------------------------------------
// brain/formatter.ts -- Format brain results into structured plaintext
// ---------------------------------------------------------------------------

import type { TriageResult, ReadinessResult, OutboxHealth, DiagnosisResult } from '../types/index.js';

export function formatTriageResult(r: TriageResult): string {
  const lines: string[] = [];
  lines.push(`TRIAGE: ${r.severity.toUpperCase()} — ${r.category} (confidence: ${(r.confidence * 100).toFixed(0)}%)`);
  lines.push('');

  lines.push(`Severity: ${r.severity.toUpperCase()}`);
  lines.push(`Category: ${r.category}`);
  lines.push(`Temporal Pattern: ${r.temporalPattern}`);
  lines.push('');

  if (r.matchedKeywords.length > 0) {
    lines.push(`Matched Keywords: ${r.matchedKeywords.join(', ')}`);
  }

  if (r.runbookRef) {
    lines.push(`Runbook: incident-response/references/runbooks/${r.runbookRef}.md`);
  }

  if (r.crossServiceAffected && r.crossServiceAffected.length > 0) {
    lines.push(`Cross-Service: ${r.crossServiceAffected.join(', ')}`);
  }

  lines.push('');
  lines.push(`RECOMMENDATION: ${r.recommendation}`);

  return lines.join('\n');
}

export function formatReadinessResult(r: ReadinessResult): string {
  const lines: string[] = [];
  const status = r.isReady ? 'READY' : 'NOT READY';
  lines.push(`PRODUCTION READINESS: ${status} (Score: ${r.score}/100)`);
  lines.push('');

  lines.push('CHECKS:');
  for (const check of r.checks) {
    const icon = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
    lines.push(`  [${icon}] ${check.variable} (${check.category}): ${check.reason}`);
  }
  lines.push('');

  if (r.criticalFailures.length > 0) {
    lines.push('CRITICAL FAILURES:');
    for (const f of r.criticalFailures) {
      lines.push(`  - ${f}`);
    }
    lines.push('');
  }

  if (r.warnings.length > 0) {
    lines.push('WARNINGS:');
    for (const w of r.warnings) {
      lines.push(`  - ${w}`);
    }
  }

  return lines.join('\n');
}

export function formatOutboxResult(r: OutboxHealth): string {
  const lines: string[] = [];
  const status = r.isHealthy ? 'HEALTHY' : 'UNHEALTHY';
  lines.push(`OUTBOX HEALTH: ${status}`);
  lines.push('');

  lines.push('STATS:');
  lines.push(`  Pending: ${r.pending}`);
  lines.push(`  Sent: ${r.sent}`);
  lines.push(`  Dead Letters: ${r.deadLetter}`);
  lines.push(`  Leased: ${r.leased}`);
  lines.push(`  Stuck Leases: ${r.stuckLeases}`);
  lines.push(`  Total: ${r.total}`);
  lines.push('');

  if (r.alerts.length > 0) {
    lines.push('ALERTS:');
    for (const alert of r.alerts) {
      lines.push(`  - ${alert}`);
    }
  } else {
    lines.push('No alerts — outbox is operating normally.');
  }

  return lines.join('\n');
}

export function formatDiagnosisResult(r: DiagnosisResult): string {
  const lines: string[] = [];
  lines.push(`DIAGNOSIS: ${r.category} (confidence: ${(r.confidence * 100).toFixed(0)}%)`);
  lines.push('');

  if (r.matchedKeywords.length > 0) {
    lines.push(`Matched Keywords: ${r.matchedKeywords.join(', ')}`);
  }

  lines.push(`Recommendation: ${r.recommendation}`);

  if (r.runbook) {
    lines.push(`Runbook: incident-response/references/runbooks/${r.runbook}.md`);
  }

  return lines.join('\n');
}
