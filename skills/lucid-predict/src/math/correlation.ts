// ---------------------------------------------------------------------------
// math/correlation.ts -- Cross-market title matching and spread calculation
// ---------------------------------------------------------------------------

import type { Market, MatchedPair } from '../types/index.js';
import { round } from '../utils/round.js';

/**
 * Calculate title similarity between two market titles.
 * Uses word overlap method: shared_words / max(words_in_A, words_in_B)
 *
 * @returns 0-1 similarity score
 */
export function titleSimilarity(titleA: string, titleB: string): number {
  const cleanA = titleA.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const cleanB = titleB.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  // Exact match
  if (cleanA === cleanB) return 1.0;

  const wordsA = new Set(cleanA.split(/\s+/).filter(Boolean));
  const wordsB = new Set(cleanB.split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }

  return round(shared / Math.max(wordsA.size, wordsB.size), 4);
}

/**
 * Match markets across two sets by title similarity.
 * Returns pairs with similarity >= minSimilarity (default 0.60).
 */
export function matchMarkets(
  marketsA: Market[],
  marketsB: Market[],
  minSimilarity: number = 0.60,
): MatchedPair[] {
  const pairs: MatchedPair[] = [];

  for (const a of marketsA) {
    for (const b of marketsB) {
      // Skip if same platform and same ID
      if (a.platform === b.platform && a.externalId === b.externalId) continue;

      const similarity = titleSimilarity(a.title, b.title);
      if (similarity >= minSimilarity) {
        pairs.push({ marketA: a, marketB: b, similarity });
      }
    }
  }

  // Sort by similarity descending
  return pairs.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate spread between two prices.
 * spread = ((priceB - priceA) / priceA) * 100
 */
export function calculateSpread(priceA: number, priceB: number): number {
  if (priceA <= 0) return 0;
  return round(((priceB - priceA) / priceA) * 100, 2);
}

/**
 * Calculate arbitrage profit.
 * If YES_A + NO_B < 1.0, guaranteed profit exists.
 *
 * @param yesPrice  Price of YES on platform A
 * @param noPrice   Price of NO on platform B (= 1 - yesPrice_B)
 * @returns { combinedCost, profit, profitPct } or null if no arb
 */
export function calculateArbitrage(
  yesPrice: number,
  noPrice: number,
): { combinedCost: number; profit: number; profitPct: number } | null {
  const combinedCost = yesPrice + noPrice;
  if (combinedCost >= 1.0) return null;

  const profit = round(1.0 - combinedCost, 4);
  const profitPct = round((profit / combinedCost) * 100, 2);

  return { combinedCost: round(combinedCost, 4), profit, profitPct };
}
