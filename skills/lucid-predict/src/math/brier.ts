// ---------------------------------------------------------------------------
// math/brier.ts -- Brier score and calibration tracking
// ---------------------------------------------------------------------------

import type { Forecast } from '../types/index.js';
import { round } from '../utils/round.js';

export interface CalibrationBucket {
  range: string;
  predicted: number;
  actual: number;
  count: number;
  deviation: number;
}

/**
 * Brier score: mean squared error of probability predictions.
 * 0 = perfect, 1 = worst possible.
 *
 * BS = (1/N) * Σ (predicted - actual)²
 */
export function brierScore(forecasts: Forecast[]): number {
  if (forecasts.length === 0) return 0;
  const sum = forecasts.reduce(
    (acc, f) => acc + (f.predictedProbability - f.actualOutcome) ** 2,
    0,
  );
  return round(sum / forecasts.length, 4);
}

/**
 * Build calibration curve: group forecasts into 10 buckets (0-0.1, 0.1-0.2, etc.)
 * and compare predicted vs actual resolution rates.
 */
export function calibrationBuckets(forecasts: Forecast[]): CalibrationBucket[] {
  const buckets: Map<string, { predicted: number[]; actual: number[] }> = new Map();

  for (let i = 0; i < 10; i++) {
    const lo = i / 10;
    const hi = (i + 1) / 10;
    const range = `${lo.toFixed(1)}-${hi.toFixed(1)}`;
    buckets.set(range, { predicted: [], actual: [] });
  }

  for (const f of forecasts) {
    const idx = Math.min(9, Math.floor(f.predictedProbability * 10));
    const lo = idx / 10;
    const hi = (idx + 1) / 10;
    const range = `${lo.toFixed(1)}-${hi.toFixed(1)}`;
    const bucket = buckets.get(range)!;
    bucket.predicted.push(f.predictedProbability);
    bucket.actual.push(f.actualOutcome);
  }

  const result: CalibrationBucket[] = [];
  for (const [range, data] of buckets) {
    if (data.predicted.length === 0) continue;
    const predicted = avg(data.predicted);
    const actual = avg(data.actual);
    result.push({
      range,
      predicted: round(predicted, 3),
      actual: round(actual, 3),
      count: data.predicted.length,
      deviation: round(Math.abs(predicted - actual), 3),
    });
  }

  return result;
}

/**
 * Overconfidence score: average (predicted - actual) across all buckets.
 * Positive = overconfident (predicted higher than actual).
 * Negative = underconfident.
 */
export function overconfidenceScore(buckets: CalibrationBucket[]): number {
  if (buckets.length === 0) return 0;
  const sum = buckets.reduce((acc, b) => acc + (b.predicted - b.actual) * b.count, 0);
  const total = buckets.reduce((acc, b) => acc + b.count, 0);
  return total > 0 ? round(sum / total, 4) : 0;
}

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}
