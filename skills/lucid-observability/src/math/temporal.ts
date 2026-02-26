// ---------------------------------------------------------------------------
// math/temporal.ts -- Temporal pattern detection
// ---------------------------------------------------------------------------
// Implements the temporal pattern algorithm from
// skills/triage/references/temporal-patterns.md

import type { TemporalPattern } from '../types/index.js';

/**
 * Detect the temporal pattern of a series of event timestamps.
 *
 * Patterns (first match wins):
 * - unknown: fewer than 2 events
 * - burst: 80%+ of events in first 20% of timespan (timespan > 1h)
 * - steady: coefficient of variation of gaps < 0.5 (needs >= 5 events)
 * - regression: max gap > 5x average gap (needs >= 3 events)
 * - sporadic: none of the above
 */
export function detectTemporalPattern(timestamps: number[]): TemporalPattern {
  if (timestamps.length < 2) return 'unknown';

  // Sort ascending (oldest first)
  const sorted = [...timestamps].sort((a, b) => a - b);

  const totalSpan = sorted[sorted.length - 1]! - sorted[0]!;

  // Calculate inter-event gaps
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i]! - sorted[i - 1]!);
  }

  // --- Burst check ---
  // 80%+ of events in first 20% of the timespan, timespan > 1h
  if (totalSpan > 3_600_000) {
    const threshold20pct = sorted[0]! + totalSpan * 0.2;
    const eventsInFirst20 = sorted.filter((t) => t <= threshold20pct).length;
    if (eventsInFirst20 / sorted.length >= 0.8) return 'burst';
  }

  // --- Steady check ---
  // CV of gaps < 0.5, needs >= 5 events (so >= 4 gaps)
  if (gaps.length >= 4) {
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (mean > 0) {
      const variance = gaps.reduce((sum, g) => sum + (g - mean) ** 2, 0) / gaps.length;
      const stddev = Math.sqrt(variance);
      const cv = stddev / mean;
      if (cv < 0.5) return 'steady';
    }
  }

  // --- Regression check ---
  // Max gap > 5x average gap, needs >= 3 events (so >= 2 gaps)
  if (gaps.length >= 2) {
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const maxGap = Math.max(...gaps);
    if (mean > 0 && maxGap > 5 * mean) return 'regression';
  }

  // --- Sporadic ---
  return 'sporadic';
}
