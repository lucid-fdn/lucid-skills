// ---------------------------------------------------------------------------
// intelligence/trend.test.ts -- Tests for trend detection, S/R, volatility
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  detectTrend,
  findSupportResistance,
  classifyVolatilityRegime,
  volatilityMultiplier,
} from './trend.js';
import type { OHLCV } from '../types/index.js';

// ---- Helpers ---------------------------------------------------------------

/** Create a simple OHLCV bar */
function bar(
  close: number,
  high?: number,
  low?: number,
  ts?: number,
): OHLCV {
  return {
    timestamp: ts ?? 0,
    open: close,
    high: high ?? close + 1,
    low: low ?? close - 1,
    close,
    volume: 1000,
  };
}

// ---- detectTrend -----------------------------------------------------------

describe('detectTrend', () => {
  it('detects strong uptrend when price > SMA20 > SMA50 and pctAbove > 5%', () => {
    // Sharp uptrend: 100..159
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
    const result = detectTrend(closes, 20, 50);
    expect(result.trend).toBe('strong_uptrend');
    expect(result.pctAboveFast).toBeGreaterThan(5);
  });

  it('detects strong downtrend when price < SMA20 < SMA50 and pctAbove < -5%', () => {
    // Sharp downtrend: 200..141
    const closes = Array.from({ length: 60 }, (_, i) => 200 - i);
    const result = detectTrend(closes, 20, 50);
    expect(result.trend).toBe('strong_downtrend');
    expect(result.pctAboveFast).toBeLessThan(-5);
  });

  it('detects sideways when price is flat', () => {
    // Perfectly flat
    const closes = Array.from({ length: 60 }, () => 100);
    const result = detectTrend(closes, 20, 50);
    expect(result.trend).toBe('sideways');
  });

  it('returns sideways for insufficient data', () => {
    const closes = [100, 101, 102];
    const result = detectTrend(closes, 20, 50);
    expect(result.trend).toBe('sideways');
  });

  it('detects uptrend when price > SMA20 > SMA50 but pctAbove <= 5%', () => {
    // Gentle uptrend: price barely above SMA20
    const closes: number[] = [];
    for (let i = 0; i < 60; i++) {
      closes.push(100 + i * 0.3); // Very gentle incline
    }
    const result = detectTrend(closes, 20, 50);
    expect(['uptrend', 'strong_uptrend']).toContain(result.trend);
  });
});

// ---- findSupportResistance -------------------------------------------------

describe('findSupportResistance', () => {
  it('finds swing highs and swing lows', () => {
    // Create bars with clear swing points
    const bars: OHLCV[] = [
      bar(100, 102, 98, 1), // 0
      bar(101, 103, 99, 2), // 1
      bar(105, 110, 103, 3), // 2 - swing high at 110
      bar(103, 106, 101, 4), // 3
      bar(100, 102, 98, 5), // 4
      bar(95, 97, 90, 6), // 5
      bar(93, 95, 88, 7), // 6 - swing low at 88
      bar(95, 97, 90, 8), // 7
      bar(100, 102, 98, 9), // 8
    ];

    const result = findSupportResistance(bars, 2);
    expect(result.resistances.length).toBeGreaterThan(0);
    expect(result.supports.length).toBeGreaterThan(0);

    // The swing high at index 2 (high=110) should be a resistance
    expect(result.resistances).toContain(110);
    // The swing low at index 6 (low=88) should be a support
    expect(result.supports).toContain(88);
  });

  it('returns empty arrays when no swing points exist', () => {
    // Monotonically increasing — no swing highs or lows
    const bars: OHLCV[] = Array.from({ length: 10 }, (_, i) =>
      bar(100 + i * 5, 103 + i * 5, 97 + i * 5, i),
    );
    const result = findSupportResistance(bars, 2);
    // Monotonic increase means no swing point where neighbors on BOTH sides are lower/higher
    expect(result.resistances).toHaveLength(0);
    expect(result.supports).toHaveLength(0);
  });

  it('supports are sorted descending (nearest first)', () => {
    const bars: OHLCV[] = [
      bar(100, 102, 98),
      bar(101, 103, 99),
      bar(105, 110, 103),
      bar(101, 103, 99),
      bar(95, 97, 90),
      bar(90, 92, 85),
      bar(85, 87, 80),
      bar(90, 92, 85),
      bar(95, 97, 90),
    ];
    const result = findSupportResistance(bars, 2);
    for (let i = 1; i < result.supports.length; i++) {
      expect(result.supports[i - 1]).toBeGreaterThanOrEqual(
        result.supports[i]!,
      );
    }
  });

  it('resistances are sorted ascending (nearest first)', () => {
    const bars: OHLCV[] = [
      bar(100, 102, 98),
      bar(103, 105, 101),
      bar(110, 115, 108),
      bar(105, 107, 103),
      bar(100, 102, 98),
      bar(105, 107, 103),
      bar(112, 120, 110),
      bar(108, 110, 106),
      bar(105, 107, 103),
    ];
    const result = findSupportResistance(bars, 2);
    for (let i = 1; i < result.resistances.length; i++) {
      expect(result.resistances[i - 1]).toBeLessThanOrEqual(
        result.resistances[i]!,
      );
    }
  });
});

// ---- classifyVolatilityRegime ----------------------------------------------

describe('classifyVolatilityRegime', () => {
  it('classifies < 30% as low', () => {
    expect(classifyVolatilityRegime(15)).toBe('low');
    expect(classifyVolatilityRegime(29.9)).toBe('low');
  });

  it('classifies 30-60% as moderate', () => {
    expect(classifyVolatilityRegime(30)).toBe('moderate');
    expect(classifyVolatilityRegime(45)).toBe('moderate');
    expect(classifyVolatilityRegime(59.9)).toBe('moderate');
  });

  it('classifies 60-100% as high', () => {
    expect(classifyVolatilityRegime(60)).toBe('high');
    expect(classifyVolatilityRegime(80)).toBe('high');
    expect(classifyVolatilityRegime(99.9)).toBe('high');
  });

  it('classifies > 100% as extreme', () => {
    expect(classifyVolatilityRegime(100)).toBe('extreme');
    expect(classifyVolatilityRegime(200)).toBe('extreme');
  });
});

// ---- volatilityMultiplier --------------------------------------------------

describe('volatilityMultiplier', () => {
  it('returns 1.0 for low', () => {
    expect(volatilityMultiplier('low')).toBe(1.0);
  });

  it('returns 1.0 for moderate', () => {
    expect(volatilityMultiplier('moderate')).toBe(1.0);
  });

  it('returns 0.5 for high', () => {
    expect(volatilityMultiplier('high')).toBe(0.5);
  });

  it('returns 0.25 for extreme', () => {
    expect(volatilityMultiplier('extreme')).toBe(0.25);
  });
});
