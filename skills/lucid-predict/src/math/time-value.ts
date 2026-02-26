// ---------------------------------------------------------------------------
// math/time-value.ts -- Time decay and near-expiry analysis
// ---------------------------------------------------------------------------

/**
 * Calculate days until market closes.
 * Returns 0 if already closed.
 */
export function daysToClose(closeDate: string): number {
  const close = new Date(closeDate).getTime();
  const now = Date.now();
  const diff = close - now;
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

/**
 * Time decay scoring.
 * Higher score = more time-decay opportunity.
 * Near-expiry markets with high probability prices are "bond-like" — low risk, guaranteed return.
 *
 * Score formula: (1 - daysRemaining/365) * (price * 100)
 * A market at 0.95 with 3 days left = (1 - 3/365) * 95 = 94.2
 * A market at 0.50 with 180 days left = (1 - 180/365) * 50 = 25.3
 */
export function timeDecayScore(days: number, price: number): number {
  if (days <= 0) return 0;
  const timeComponent = Math.max(0, 1 - days / 365);
  return Math.round(timeComponent * price * 100);
}

/**
 * Check if this is a "near-certain expiry" — the whale bond strategy.
 * Returns true if market is closing soon AND price is very high.
 *
 * @param days      Days to close
 * @param price     Current YES price
 * @param threshold Minimum price to consider "near-certain" (default 0.90)
 */
export function isNearCertainExpiry(
  days: number,
  price: number,
  threshold: number = 0.90,
): boolean {
  return days > 0 && days <= 7 && price >= threshold;
}
