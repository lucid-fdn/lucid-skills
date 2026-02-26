// ---------------------------------------------------------------------------
// math/odds.ts -- Odds format conversion for prediction markets
// ---------------------------------------------------------------------------

import type { OddsFormat } from '../types/index.js';
import { round } from '../utils/round.js';

/**
 * Convert odds between formats.
 * Supported: probability (0-1), decimal (1.0+), american (+/-), fractional (numerator only, denom=1)
 */
export function convertOdds(value: number, from: OddsFormat, to: OddsFormat): number {
  if (from === to) return value;

  // Step 1: convert to probability
  let prob: number;
  switch (from) {
    case 'probability':
      prob = value;
      break;
    case 'decimal':
      prob = value > 0 ? 1 / value : 0;
      break;
    case 'american':
      if (value > 0) prob = 100 / (value + 100);
      else if (value < 0) prob = Math.abs(value) / (Math.abs(value) + 100);
      else prob = 0;
      break;
    case 'fractional':
      prob = 1 / (value + 1);
      break;
    default:
      prob = 0;
  }

  // Step 2: convert probability to target
  if (prob <= 0 || prob >= 1) {
    // Edge cases: return sensible defaults
    if (to === 'probability') return Math.max(0, Math.min(1, prob));
    if (to === 'decimal') return prob <= 0 ? Infinity : 1;
    return 0;
  }

  switch (to) {
    case 'probability':
      return round(prob, 4);
    case 'decimal':
      return round(1 / prob, 4);
    case 'american': {
      const decimal = 1 / prob;
      if (decimal >= 2.0) return round((decimal - 1) * 100, 1);
      else return round(-100 / (decimal - 1), 1);
    }
    case 'fractional':
      return round((1 / prob) - 1, 4);
    default:
      return 0;
  }
}

/** Price IS implied probability in binary prediction markets. */
export function impliedProbability(price: number): number {
  return Math.max(0, Math.min(1, price));
}

