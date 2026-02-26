// ---------------------------------------------------------------------------
// math/efficiency.ts -- Market efficiency analysis (overround, vig, fair prices)
// ---------------------------------------------------------------------------

import { round } from '../utils/round.js';

export interface EfficiencyResult {
  overround: number;     // (sum(prices) - 1) * 100  (percentage)
  vig: number;           // ((sum - 1) / sum) * 100  (percentage)
  fairPrices: number[];  // normalized prices summing to 1.0
  isEfficient: boolean;  // |overround| <= 5%
}

/**
 * Analyze market efficiency from outcome prices.
 * For binary markets, pass [yesPrice, noPrice].
 * For multi-outcome, pass all outcome prices.
 */
export function analyzeEfficiency(prices: number[]): EfficiencyResult {
  if (prices.length === 0) {
    return { overround: 0, vig: 0, fairPrices: [], isEfficient: true };
  }

  const total = prices.reduce((sum, p) => sum + p, 0);
  const overround = (total - 1) * 100;
  const vig = total > 0 ? ((total - 1) / total) * 100 : 0;
  const fairPrices = total > 0 ? prices.map((p) => round(p / total, 4)) : prices;
  const isEfficient = Math.abs(overround) <= 5;

  return { overround: round(overround, 2), vig: round(vig, 2), fairPrices, isEfficient };
}

