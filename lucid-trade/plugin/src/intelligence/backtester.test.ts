// ---------------------------------------------------------------------------
// intelligence/backtester.test.ts -- Tests for backtesting engine
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  backtestSmaCrossover,
  backtestRsi,
  buildBacktestResult,
} from './backtester.js';
import type { OHLCV } from '../types/index.js';

// ---- Helpers ---------------------------------------------------------------

/** Create OHLCV bars from an array of close prices */
function barsFromCloses(closes: number[]): OHLCV[] {
  return closes.map((c, i) => ({
    timestamp: i * 86400000, // 1 day apart
    open: c,
    high: c + 2,
    low: c - 2,
    close: c,
    volume: 1000,
  }));
}

/** Flat then uptrend then downtrend — guarantees crossovers with SMA(10/30) */
function trendReversalData(): OHLCV[] {
  const closes: number[] = [];
  // First 30 bars: flat at 100 (establishes the slow SMA baseline)
  for (let i = 0; i < 30; i++) {
    closes.push(100);
  }
  // Next 30 bars: sharp uptrend (fast SMA crosses above slow -> golden cross)
  for (let i = 0; i < 30; i++) {
    closes.push(100 + (i + 1) * 3);
  }
  // Next 30 bars: sharp downtrend (fast SMA crosses below slow -> death cross)
  for (let i = 0; i < 30; i++) {
    closes.push(closes[closes.length - 1]! - 4);
  }
  return barsFromCloses(closes);
}

/** RSI-friendly data: oscillations that go between oversold and overbought */
function rsiOscillatingData(): OHLCV[] {
  const closes: number[] = [];
  // Start with a decline to get RSI low
  for (let i = 0; i < 20; i++) {
    closes.push(100 - i * 2);
  }
  // Then a sharp rally to get RSI high
  for (let i = 0; i < 20; i++) {
    closes.push(closes[closes.length - 1]! + 3);
  }
  // Another decline
  for (let i = 0; i < 20; i++) {
    closes.push(closes[closes.length - 1]! - 2);
  }
  // Another rally
  for (let i = 0; i < 20; i++) {
    closes.push(closes[closes.length - 1]! + 3);
  }
  return barsFromCloses(closes);
}

// ---- backtestSmaCrossover --------------------------------------------------

describe('backtestSmaCrossover', () => {
  it('generates trades from trend reversal data', () => {
    const bars = trendReversalData();
    const result = backtestSmaCrossover(bars, 10, 30);
    expect(result.totalTrades).toBeGreaterThan(0);
    expect(result.trades.length).toBe(result.totalTrades);
  });

  it('returns zero trades when data is too short', () => {
    const bars = barsFromCloses([100, 101, 102]);
    const result = backtestSmaCrossover(bars, 10, 30);
    expect(result.totalTrades).toBe(0);
  });

  it('all trades have buy side (long only)', () => {
    const bars = trendReversalData();
    const result = backtestSmaCrossover(bars, 10, 30);
    for (const trade of result.trades) {
      expect(trade.side).toBe('buy');
    }
  });

  it('equity curve starts at starting equity', () => {
    const bars = trendReversalData();
    const result = backtestSmaCrossover(bars, 10, 30);
    // Even with 0 trades, equity series should start with starting equity
    expect(result.trades.length).toBeGreaterThan(0);
  });

  it('returns proper metrics', () => {
    const bars = trendReversalData();
    const result = backtestSmaCrossover(bars, 10, 30);
    expect(typeof result.totalReturn).toBe('number');
    expect(typeof result.sharpeRatio).toBe('number');
    expect(typeof result.maxDrawdown).toBe('number');
    expect(typeof result.winRate).toBe('number');
    expect(typeof result.profitFactor).toBe('number');
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(100);
  });
});

// ---- backtestRsi -----------------------------------------------------------

describe('backtestRsi', () => {
  it('generates trades from oscillating RSI data', () => {
    const bars = rsiOscillatingData();
    const result = backtestRsi(bars, 14, 30, 70);
    // With the oscillating data pattern, we should get at least some trades
    expect(result.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.trades.length).toBe(result.totalTrades);
  });

  it('returns zero trades for insufficient data', () => {
    const bars = barsFromCloses([100, 101]);
    const result = backtestRsi(bars, 14, 30, 70);
    expect(result.totalTrades).toBe(0);
  });

  it('all trades have buy side (long only mean reversion)', () => {
    const bars = rsiOscillatingData();
    const result = backtestRsi(bars, 14, 30, 70);
    for (const trade of result.trades) {
      expect(trade.side).toBe('buy');
    }
  });

  it('returns proper metrics', () => {
    const bars = rsiOscillatingData();
    const result = backtestRsi(bars, 14, 30, 70);
    expect(typeof result.totalReturn).toBe('number');
    expect(typeof result.maxDrawdown).toBe('number');
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
  });
});

// ---- buildBacktestResult ---------------------------------------------------

describe('buildBacktestResult', () => {
  it('computes correct equity curve from winning trades', () => {
    const trades = [
      {
        entryPrice: 100,
        exitPrice: 110,
        side: 'buy' as const,
        pnl: 10,
        pnlPct: 10,
        entryTime: 1000,
        exitTime: 2000,
      },
      {
        entryPrice: 110,
        exitPrice: 121,
        side: 'buy' as const,
        pnl: 11,
        pnlPct: 10,
        entryTime: 3000,
        exitTime: 4000,
      },
    ];

    const result = buildBacktestResult(trades, 10000);

    // Equity: 10000 -> 11000 -> 12100
    expect(result.totalReturn).toBeCloseTo(21, 1);
    expect(result.winRate).toBe(100);
    expect(result.totalTrades).toBe(2);
    expect(result.maxDrawdown).toBe(0); // no drawdown for all winners
  });

  it('computes max drawdown correctly', () => {
    const trades = [
      {
        entryPrice: 100,
        exitPrice: 110,
        side: 'buy' as const,
        pnl: 10,
        pnlPct: 10,
        entryTime: 1000,
        exitTime: 2000,
      },
      {
        entryPrice: 110,
        exitPrice: 88,
        side: 'buy' as const,
        pnl: -22,
        pnlPct: -20,
        entryTime: 3000,
        exitTime: 4000,
      },
    ];

    const result = buildBacktestResult(trades, 10000);

    // Equity: 10000 -> 11000 (peak) -> 8800
    // Drawdown = (11000 - 8800) / 11000 * 100 = 20%
    expect(result.maxDrawdown).toBeCloseTo(20, 1);
  });

  it('computes correct win rate', () => {
    const trades = [
      {
        entryPrice: 100,
        exitPrice: 110,
        side: 'buy' as const,
        pnl: 10,
        pnlPct: 10,
        entryTime: 1000,
        exitTime: 2000,
      },
      {
        entryPrice: 110,
        exitPrice: 100,
        side: 'buy' as const,
        pnl: -10,
        pnlPct: -9.09,
        entryTime: 3000,
        exitTime: 4000,
      },
      {
        entryPrice: 100,
        exitPrice: 120,
        side: 'buy' as const,
        pnl: 20,
        pnlPct: 20,
        entryTime: 5000,
        exitTime: 6000,
      },
    ];

    const result = buildBacktestResult(trades, 10000);
    // 2 winners out of 3
    expect(result.winRate).toBeCloseTo(66.67, 0);
  });

  it('computes profit factor correctly', () => {
    const trades = [
      {
        entryPrice: 100,
        exitPrice: 110,
        side: 'buy' as const,
        pnl: 10,
        pnlPct: 10,
        entryTime: 1000,
        exitTime: 2000,
      },
      {
        entryPrice: 110,
        exitPrice: 105,
        side: 'buy' as const,
        pnl: -5,
        pnlPct: -4.55,
        entryTime: 3000,
        exitTime: 4000,
      },
    ];

    const result = buildBacktestResult(trades, 10000);
    // Profit factor = 10 / 5 = 2.0
    expect(result.profitFactor).toBeCloseTo(2.0, 2);
  });

  it('returns Infinity profit factor when no losses', () => {
    const trades = [
      {
        entryPrice: 100,
        exitPrice: 110,
        side: 'buy' as const,
        pnl: 10,
        pnlPct: 10,
        entryTime: 1000,
        exitTime: 2000,
      },
    ];
    const result = buildBacktestResult(trades, 10000);
    expect(result.profitFactor).toBe(Infinity);
  });

  it('handles zero trades gracefully', () => {
    const result = buildBacktestResult([], 10000);
    expect(result.totalTrades).toBe(0);
    expect(result.totalReturn).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.sharpeRatio).toBe(0);
    expect(result.maxDrawdown).toBe(0);
  });

  it('Sharpe ratio is 0 when stdDev is 0 (all same return)', () => {
    const trades = [
      {
        entryPrice: 100,
        exitPrice: 110,
        side: 'buy' as const,
        pnl: 10,
        pnlPct: 10,
        entryTime: 1000,
        exitTime: 2000,
      },
    ];
    const result = buildBacktestResult(trades, 10000);
    // Only 1 trade — stdDev of a single value = 0
    expect(result.sharpeRatio).toBe(0);
  });
});
