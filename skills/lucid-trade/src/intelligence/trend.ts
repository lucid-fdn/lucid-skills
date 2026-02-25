// ---------------------------------------------------------------------------
// intelligence/trend.ts -- Trend detection, support/resistance, volatility
// ---------------------------------------------------------------------------
// Formulas sourced from skills/market-analysis/references/indicators.md
// ---------------------------------------------------------------------------

import { sma } from './indicators.js';
import type { OHLCV } from '../types/index.js';

// ---- Types -----------------------------------------------------------------

export type TrendType =
  | 'strong_uptrend'
  | 'uptrend'
  | 'sideways'
  | 'downtrend'
  | 'strong_downtrend';

export type VolatilityRegime = 'low' | 'moderate' | 'high' | 'extreme';

export interface TrendResult {
  trend: TrendType;
  pctAboveFast: number;
}

export interface SupportResistanceResult {
  supports: number[];
  resistances: number[];
}

// ---- detectTrend -----------------------------------------------------------

/**
 * Detect the current market trend using SMA 20/50 crossover analysis.
 *
 * Classification:
 *   strong_uptrend:   price > SMA(fast) > SMA(slow) AND pctAbove > 5%
 *   uptrend:          price > SMA(fast) AND SMA(fast) > SMA(slow)
 *   strong_downtrend: price < SMA(fast) < SMA(slow) AND pctAbove < -5%
 *   downtrend:        price < SMA(fast) AND SMA(fast) < SMA(slow)
 *   sideways:         everything else
 *
 * Returns { trend, pctAboveFast } where pctAboveFast = (price - SMA_fast) / SMA_fast * 100
 */
export function detectTrend(
  closes: number[],
  fastPeriod = 20,
  slowPeriod = 50,
): TrendResult {
  const fastSma = sma(closes, fastPeriod);
  const slowSma = sma(closes, slowPeriod);

  if (fastSma.length === 0 || slowSma.length === 0) {
    return { trend: 'sideways', pctAboveFast: 0 };
  }

  const price = closes[closes.length - 1]!;
  const currentFast = fastSma[fastSma.length - 1]!;
  const currentSlow = slowSma[slowSma.length - 1]!;
  const pctAboveFast = ((price - currentFast) / currentFast) * 100;

  if (price > currentFast && currentFast > currentSlow) {
    if (pctAboveFast > 5) {
      return { trend: 'strong_uptrend', pctAboveFast };
    }
    return { trend: 'uptrend', pctAboveFast };
  }

  if (price < currentFast && currentFast < currentSlow) {
    if (pctAboveFast < -5) {
      return { trend: 'strong_downtrend', pctAboveFast };
    }
    return { trend: 'downtrend', pctAboveFast };
  }

  return { trend: 'sideways', pctAboveFast };
}

// ---- findSupportResistance -------------------------------------------------

/**
 * Find support and resistance levels using swing highs/lows.
 *
 * Swing Low (Support):  bar[i].low < all neighbors within `lookback` bars on both sides
 * Swing High (Resistance): bar[i].high > all neighbors within `lookback` bars on both sides
 *
 * Returns:
 *   supports — sorted descending (nearest/strongest first)
 *   resistances — sorted ascending (nearest first)
 */
export function findSupportResistance(
  bars: OHLCV[],
  lookback = 2,
): SupportResistanceResult {
  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = lookback; i < bars.length - lookback; i++) {
    const currentBar = bars[i]!;
    let isSwingLow = true;
    let isSwingHigh = true;

    for (let j = 1; j <= lookback; j++) {
      const leftBar = bars[i - j]!;
      const rightBar = bars[i + j]!;

      if (currentBar.low >= leftBar.low || currentBar.low >= rightBar.low) {
        isSwingLow = false;
      }
      if (
        currentBar.high <= leftBar.high ||
        currentBar.high <= rightBar.high
      ) {
        isSwingHigh = false;
      }

      if (!isSwingLow && !isSwingHigh) break;
    }

    if (isSwingLow) supports.push(currentBar.low);
    if (isSwingHigh) resistances.push(currentBar.high);
  }

  // Sort supports descending (nearest/strongest first)
  supports.sort((a, b) => b - a);
  // Sort resistances ascending (nearest first)
  resistances.sort((a, b) => a - b);

  return { supports, resistances };
}

// ---- classifyVolatilityRegime ----------------------------------------------

/**
 * Classify volatility regime based on historical volatility percentage.
 *
 * < 30%:    low
 * 30-60%:   moderate
 * 60-100%:  high
 * >= 100%:  extreme
 */
export function classifyVolatilityRegime(
  historicalVol: number,
): VolatilityRegime {
  if (historicalVol < 30) return 'low';
  if (historicalVol < 60) return 'moderate';
  if (historicalVol < 100) return 'high';
  return 'extreme';
}

// ---- volatilityMultiplier --------------------------------------------------

/**
 * Returns a position sizing multiplier based on volatility regime.
 *
 * low:      1.0x (full size)
 * moderate: 1.0x (standard)
 * high:     0.5x (half size)
 * extreme:  0.25x (quarter size)
 */
export function volatilityMultiplier(regime: VolatilityRegime): number {
  switch (regime) {
    case 'low':
      return 1.0;
    case 'moderate':
      return 1.0;
    case 'high':
      return 0.5;
    case 'extreme':
      return 0.25;
  }
}
