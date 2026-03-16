// ---------------------------------------------------------------------------
// math/outbox.ts -- Outbox health analysis
// ---------------------------------------------------------------------------
// Implements thresholds from skills/billing-health/references/thresholds.md

import type { OutboxHealth } from '../types/index.js';

/**
 * Analyze OpenMeter outbox health from raw statistics.
 *
 * Thresholds (from markdown):
 * - pending > 500 → HIGH QUEUE DEPTH
 * - deadLetter > 0 → DEAD LETTERS
 * - stuckLeases > 0 → STUCK LEASES (worker may have crashed)
 * - sent = 0 AND total > 0 → NO EVENTS DELIVERED (CRITICAL)
 */
export function analyzeOutboxHealth(stats: {
  pending: number;
  sent: number;
  deadLetter: number;
  leased: number;
  total: number;
  stuckLeases: number;
}): OutboxHealth {
  const alerts: string[] = [];

  // CRITICAL: events created but none delivered
  if (stats.sent === 0 && stats.total > 0) {
    alerts.push('CRITICAL: No events delivered (sent=0 with total>0) — check API connectivity');
  }

  // HIGH: queue backing up
  if (stats.pending > 500) {
    alerts.push(`HIGH: Queue depth is ${stats.pending} (threshold: 500) — worker can't keep pace`);
  }

  // HIGH: dead letters exist
  if (stats.deadLetter > 0) {
    alerts.push(`HIGH: ${stats.deadLetter} dead letter(s) — events failed 10+ delivery attempts`);
  }

  // MEDIUM: stuck leases
  if (stats.stuckLeases > 0) {
    alerts.push(`MEDIUM: ${stats.stuckLeases} stuck lease(s) — outbox worker may have crashed`);
  }

  const isHealthy = alerts.length === 0;

  return {
    pending: stats.pending,
    sent: stats.sent,
    deadLetter: stats.deadLetter,
    leased: stats.leased,
    total: stats.total,
    stuckLeases: stats.stuckLeases,
    alerts,
    isHealthy,
  };
}
