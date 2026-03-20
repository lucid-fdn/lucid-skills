// ---------------------------------------------------------------------------
// math/ev.ts -- Expected value calculator for prediction markets
// ---------------------------------------------------------------------------

export interface EvResult {
  payout: number;
  expectedPayout: number;
  ev: number;
  roiPct: number;
  edgePct: number;
  isPositiveEv: boolean;
}

/**
 * Calculate expected value for a prediction market position.
 *
 * @param stake       Amount you're betting
 * @param price       Market price (0-1, e.g. 0.40 = 40 cents)
 * @param probability Your estimated true probability (0-1)
 */
export function expectedValue(stake: number, price: number, probability: number): EvResult {
  if (price <= 0 || price >= 1 || stake <= 0) {
    return { payout: 0, expectedPayout: 0, ev: 0, roiPct: 0, edgePct: 0, isPositiveEv: false };
  }
  const payout = stake / price;
  const expectedPayout = probability * payout;
  const ev = expectedPayout - stake;
  const roiPct = stake > 0 ? (ev / stake) * 100 : 0;
  const edgePct = (probability - price) * 100;
  return { payout, expectedPayout, ev, roiPct, edgePct, isPositiveEv: ev > 0 };
}
