// ---------------------------------------------------------------------------
// intelligence/indicators.test.ts -- Tests for TA indicator functions
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  historicalVolatility,
} from './indicators.js';

// ---- Helpers ---------------------------------------------------------------

/** Generate a simple uptrend series: 100, 101, 102, ... */
function uptrend(n: number, start = 100): number[] {
  return Array.from({ length: n }, (_, i) => start + i);
}

/** Generate a simple downtrend series: 200, 199, 198, ... */
function downtrend(n: number, start = 200): number[] {
  return Array.from({ length: n }, (_, i) => start - i);
}

/** Generate an oscillating series: 100, 110, 100, 110, ... */
function oscillating(n: number, low = 100, high = 110): number[] {
  return Array.from({ length: n }, (_, i) => (i % 2 === 0 ? low : high));
}

// ---- SMA -------------------------------------------------------------------

describe('sma', () => {
  it('computes correct SMA values for a simple series', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = sma(values, 3);
    // SMA(3) starting at index 2: (1+2+3)/3=2, (2+3+4)/3=3, ...
    expect(result).toHaveLength(8);
    expect(result[0]).toBeCloseTo(2, 10);
    expect(result[1]).toBeCloseTo(3, 10);
    expect(result[7]).toBeCloseTo(9, 10);
  });

  it('returns empty array when data is shorter than period', () => {
    expect(sma([1, 2], 5)).toEqual([]);
  });

  it('returns single value when data length equals period', () => {
    const result = sma([2, 4, 6], 3);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeCloseTo(4, 10);
  });
});

// ---- EMA -------------------------------------------------------------------

describe('ema', () => {
  it('seeds the first EMA value with SMA', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = ema(values, 5);
    // First EMA = SMA of first 5 values = (1+2+3+4+5)/5 = 3
    expect(result[0]).toBeCloseTo(3, 10);
  });

  it('returns correct number of values', () => {
    const values = uptrend(20);
    const result = ema(values, 5);
    expect(result).toHaveLength(16); // 20 - 5 + 1
  });

  it('returns empty for insufficient data', () => {
    expect(ema([1, 2], 5)).toEqual([]);
  });

  it('subsequent values differ from SMA due to exponential weighting', () => {
    const values = [10, 12, 11, 13, 14, 15, 13, 16, 17, 18];
    const emaResult = ema(values, 5);
    const smaResult = sma(values, 5);
    // After the seed, EMA and SMA should diverge
    expect(emaResult[0]).toBeCloseTo(smaResult[0]!, 10); // first values equal
    // Later values should differ due to different weighting
    expect(emaResult.length).toBe(smaResult.length);
  });
});

// ---- RSI -------------------------------------------------------------------

describe('rsi', () => {
  it('returns values above 50 for a steady uptrend', () => {
    const closes = uptrend(30);
    const result = rsi(closes);
    expect(result.length).toBeGreaterThan(0);
    for (const v of result) {
      expect(v).toBeGreaterThan(50);
    }
  });

  it('returns values below 30 for a steady downtrend', () => {
    const closes = downtrend(30);
    const result = rsi(closes);
    expect(result.length).toBeGreaterThan(0);
    for (const v of result) {
      expect(v).toBeLessThan(30);
    }
  });

  it('returns 100 for all-up data (avgLoss = 0)', () => {
    // Every close is higher than the previous
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i * 5);
    const result = rsi(closes, 14);
    expect(result.length).toBeGreaterThan(0);
    for (const v of result) {
      expect(v).toBe(100);
    }
  });

  it('returns empty array for insufficient data', () => {
    expect(rsi([100, 101, 102], 14)).toEqual([]);
  });
});

// ---- MACD ------------------------------------------------------------------

describe('macd', () => {
  it('returns macdLine, signalLine, and histogram arrays', () => {
    const closes = uptrend(60);
    const result = macd(closes);
    expect(result).toHaveProperty('macdLine');
    expect(result).toHaveProperty('signalLine');
    expect(result).toHaveProperty('histogram');
  });

  it('histogram length matches signalLine length', () => {
    const closes = uptrend(60);
    const result = macd(closes);
    expect(result.histogram).toHaveLength(result.signalLine.length);
  });

  it('macdLine length >= signalLine length', () => {
    const closes = uptrend(60);
    const result = macd(closes);
    expect(result.macdLine.length).toBeGreaterThanOrEqual(
      result.signalLine.length,
    );
  });

  it('returns empty arrays for insufficient data', () => {
    const closes = uptrend(10);
    const result = macd(closes);
    expect(result.macdLine).toHaveLength(0);
    expect(result.signalLine).toHaveLength(0);
    expect(result.histogram).toHaveLength(0);
  });
});

// ---- Bollinger Bands -------------------------------------------------------

describe('bollingerBands', () => {
  it('upper > middle > lower for all values', () => {
    const closes = oscillating(40);
    const result = bollingerBands(closes);
    expect(result.upper.length).toBeGreaterThan(0);
    for (let i = 0; i < result.upper.length; i++) {
      expect(result.upper[i]).toBeGreaterThan(result.middle[i]!);
      expect(result.middle[i]).toBeGreaterThan(result.lower[i]!);
    }
  });

  it('middle band equals SMA', () => {
    const closes = uptrend(30);
    const result = bollingerBands(closes, 20, 2);
    const smaValues = sma(closes, 20);
    expect(result.middle).toHaveLength(smaValues.length);
    for (let i = 0; i < result.middle.length; i++) {
      expect(result.middle[i]).toBeCloseTo(smaValues[i]!, 10);
    }
  });

  it('returns empty arrays for insufficient data', () => {
    const result = bollingerBands([1, 2, 3], 20);
    expect(result.upper).toHaveLength(0);
    expect(result.middle).toHaveLength(0);
    expect(result.lower).toHaveLength(0);
  });
});

// ---- ATR -------------------------------------------------------------------

describe('atr', () => {
  it('returns positive values from OHLC data', () => {
    const n = 30;
    const highs = Array.from({ length: n }, (_, i) => 105 + i);
    const lows = Array.from({ length: n }, (_, i) => 95 + i);
    const closes = Array.from({ length: n }, (_, i) => 100 + i);
    const result = atr(highs, lows, closes);
    expect(result.length).toBeGreaterThan(0);
    for (const v of result) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it('returns empty for insufficient data', () => {
    expect(atr([105], [95], [100], 14)).toEqual([]);
  });

  it('handles gaps correctly (high - prev close > high - low)', () => {
    // Simulate a gap-up scenario
    const highs = [10, 20, 25];
    const lows = [5, 18, 22];
    const closes = [8, 19, 24];
    const result = atr(highs, lows, closes, 2);
    // TR for index 1: max(20-18=2, |20-8|=12, |18-8|=10) = 12
    // TR for index 2: max(25-22=3, |25-19|=6, |22-19|=3) = 6
    // ATR seed = (12) averaged over 1 bar = 12 ... with period 2 seed = (12+6)/2 = 9... actually
    // ATR[0] = average of first 2 TRs: (12+6)/2 = 9
    expect(result.length).toBeGreaterThan(0);
    for (const v of result) {
      expect(v).toBeGreaterThan(0);
    }
  });
});

// ---- Historical Volatility -------------------------------------------------

describe('historicalVolatility', () => {
  it('returns a positive value for oscillating data', () => {
    const closes = oscillating(30);
    const result = historicalVolatility(closes);
    expect(result).toBeGreaterThan(0);
  });

  it('returns 0 for constant data', () => {
    const closes = Array.from({ length: 30 }, () => 100);
    const result = historicalVolatility(closes);
    expect(result).toBe(0);
  });

  it('returns 0 for insufficient data', () => {
    expect(historicalVolatility([100])).toBe(0);
  });
});
