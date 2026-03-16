// ---------------------------------------------------------------------------
// math/bayesian.ts -- Bayesian probability estimation (Tetlock method)
// ---------------------------------------------------------------------------

import { round } from '../utils/round.js';

export interface Adjustment {
  factor: string;
  direction: 'up' | 'down';
  magnitude: number; // 0-1, how much to shift probability
  reasoning: string;
}

/**
 * Estimate probability using Tetlock's superforecasting method:
 * 1. Start with a base rate (outside view)
 * 2. Apply adjustments (inside view) — each shifts the probability
 *
 * Adjustments are applied multiplicatively to avoid overshooting:
 * - "up" adjustments: new = old + (1 - old) * magnitude
 * - "down" adjustments: new = old - old * magnitude
 *
 * This ensures the result stays in (0, 1) regardless of adjustment count.
 */
export function estimateProbability(baseRate: number, adjustments: Adjustment[]): number {
  let prob = Math.max(0.01, Math.min(0.99, baseRate));

  for (const adj of adjustments) {
    const mag = Math.max(0, Math.min(1, adj.magnitude));
    if (adj.direction === 'up') {
      prob = prob + (1 - prob) * mag;
    } else {
      prob = prob - prob * mag;
    }
  }

  return round(Math.max(0.01, Math.min(0.99, prob)), 4);
}

/**
 * Classical Bayesian update: posterior = (prior * likelihood) / evidence
 * Simplified: given a likelihood ratio, update prior.
 *
 * posterior = prior * LR / (prior * LR + (1 - prior))
 */
export function bayesianUpdate(prior: number, likelihoodRatio: number): number {
  if (prior <= 0 || prior >= 1 || likelihoodRatio <= 0) return prior;
  const numerator = prior * likelihoodRatio;
  const denominator = numerator + (1 - prior);
  return round(numerator / denominator, 4);
}
