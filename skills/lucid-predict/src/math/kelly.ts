// ---------------------------------------------------------------------------
// math/kelly.ts -- Kelly criterion position sizing for prediction markets
// ---------------------------------------------------------------------------

import { round } from '../utils/round.js';

export interface KellyResult {
  fullKelly: number;
  halfKelly: number;
  recommended: number;
  positionSize: number;
  shouldBet: boolean;
}

/**
 * Kelly criterion: optimal fraction of bankroll to wager.
 *
 * f* = (b * p - q) / b
 * where b = net odds = (1/price) - 1, p = prob, q = 1-p
 *
 * @param price        Market price (0-1)
 * @param probability  Your estimated true probability (0-1)
 * @param bankroll     Total bankroll
 * @param maxFraction  Maximum fraction to bet (default 0.25)
 */
export function kellyFraction(
  price: number,
  probability: number,
  bankroll: number,
  maxFraction: number = 0.25,
): KellyResult {
  if (price <= 0 || price >= 1 || probability <= 0 || probability >= 1 || bankroll <= 0) {
    return { fullKelly: 0, halfKelly: 0, recommended: 0, positionSize: 0, shouldBet: false };
  }

  const b = (1 / price) - 1; // net odds
  const p = probability;
  const q = 1 - p;
  const fStar = Math.max(0, (b * p - q) / b);

  const halfK = fStar / 2;
  const recommended = Math.min(halfK, maxFraction);
  const positionSize = bankroll * recommended;

  return {
    fullKelly: round(fStar, 4),
    halfKelly: round(halfK, 4),
    recommended: round(recommended, 4),
    positionSize: round(positionSize, 2),
    shouldBet: fStar > 0,
  };
}

