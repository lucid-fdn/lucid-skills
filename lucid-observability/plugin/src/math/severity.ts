// ---------------------------------------------------------------------------
// math/severity.ts -- Severity scoring matrix
// ---------------------------------------------------------------------------
// Implements the severity matrix from skills/triage/references/severity-matrix.md

import type { Severity } from '../types/index.js';

/**
 * Score severity of a Sentry issue based on level, count, user count, and recency.
 *
 * Priority order (first match wins):
 * - CRITICAL: fatal, count > 1000, or count > 100 within last hour
 * - HIGH: error with count > 100 or userCount > 10
 * - MEDIUM: error with count > 10
 * - LOW: everything else
 */
export function scoreSeverity(issue: {
  level: string;
  count: number;
  userCount: number;
  lastSeen: string;
}): Severity {
  // CRITICAL: any fatal
  if (issue.level === 'fatal') return 'critical';

  // CRITICAL: extreme volume
  if (issue.count > 1000) return 'critical';

  // CRITICAL: high volume AND recent activity
  const hoursSinceLastSeen = (Date.now() - new Date(issue.lastSeen).getTime()) / 3_600_000;
  if (issue.count > 100 && hoursSinceLastSeen < 1) return 'critical';

  // HIGH: error with significant count or user impact
  if (issue.level === 'error' && (issue.count > 100 || issue.userCount > 10)) return 'high';

  // MEDIUM: error with moderate count
  if (issue.level === 'error' && issue.count > 10) return 'medium';

  // LOW: everything else
  return 'low';
}
