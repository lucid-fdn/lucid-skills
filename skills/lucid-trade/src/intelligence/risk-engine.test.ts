// ---------------------------------------------------------------------------
// intelligence/risk-engine.test.ts -- Tests for risk management functions
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  fixedPercentageSize,
  kellyCriterionSize,
  calculateRiskReward,
  calculateLiquidationPrice,
} from './risk-engine.js';

// ---- fixedPercentageSize ---------------------------------------------------

describe('fixedPercentageSize', () => {
  it('computes correct position size from fixed-% risk model', () => {
    const result = fixedPercentageSize({
      portfolioValue: 10000,
      riskPct: 2,
      entryPrice: 100,
      stopLossPrice: 95,
      maxPositionPct: 10,
    });

    // Risk Amount = 10000 * 2/100 = 200
    // Stop Loss Distance = |100 - 95| = 5
    // Position Size = 200 / 5 = 40 units
    // Position Value = 40 * 100 = 4000
    // Max Allowed = 10000 * 10/100 = 1000 — cap!
    // Capped Position Size = 1000 / 100 = 10 units

    expect(result.riskAmount).toBeCloseTo(200, 2);
    expect(result.stopLossDistance).toBeCloseTo(5, 2);
    expect(result.positionSize).toBeCloseTo(10, 2); // capped
    expect(result.positionValue).toBeCloseTo(1000, 2); // capped
    expect(result.capped).toBe(true);
  });

  it('does not cap when position value is within limit', () => {
    const result = fixedPercentageSize({
      portfolioValue: 100000,
      riskPct: 1,
      entryPrice: 50,
      stopLossPrice: 48,
      maxPositionPct: 50,
    });

    // Risk Amount = 100000 * 1/100 = 1000
    // Stop Loss Distance = |50 - 48| = 2
    // Position Size = 1000 / 2 = 500 units
    // Position Value = 500 * 50 = 25000
    // Max Allowed = 100000 * 50/100 = 50000 — not capped

    expect(result.positionSize).toBeCloseTo(500, 2);
    expect(result.positionValue).toBeCloseTo(25000, 2);
    expect(result.capped).toBe(false);
  });

  it('handles short position (stop loss above entry)', () => {
    const result = fixedPercentageSize({
      portfolioValue: 10000,
      riskPct: 2,
      entryPrice: 100,
      stopLossPrice: 105,
      maxPositionPct: 50,
    });

    // Stop Loss Distance = |100 - 105| = 5
    expect(result.stopLossDistance).toBeCloseTo(5, 2);
    expect(result.positionSize).toBeCloseTo(40, 2);
  });

  it('returns zero position size when entry equals stop loss', () => {
    const result = fixedPercentageSize({
      portfolioValue: 10000,
      riskPct: 2,
      entryPrice: 100,
      stopLossPrice: 100,
      maxPositionPct: 50,
    });
    expect(result.positionSize).toBe(0);
    expect(result.positionValue).toBe(0);
  });
});

// ---- kellyCriterionSize ----------------------------------------------------

describe('kellyCriterionSize', () => {
  it('computes half-Kelly position size', () => {
    const result = kellyCriterionSize({
      portfolioValue: 10000,
      winRate: 0.6,
      avgWinPct: 5,
      avgLossPct: 3,
    });

    // kelly = (0.6 * 5 - 0.4 * 3) / 5 = (3.0 - 1.2) / 5 = 0.36
    // halfKelly = 0.36 / 2 = 0.18
    // Position Value = 10000 * 0.18 = 1800

    expect(result.kellyFraction).toBeCloseTo(0.36, 4);
    expect(result.halfKellyFraction).toBeCloseTo(0.18, 4);
    expect(result.positionValue).toBeCloseTo(1800, 2);
  });

  it('returns zero when Kelly is negative (edge is negative)', () => {
    const result = kellyCriterionSize({
      portfolioValue: 10000,
      winRate: 0.3,
      avgWinPct: 2,
      avgLossPct: 5,
    });

    // kelly = (0.3 * 2 - 0.7 * 5) / 2 = (0.6 - 3.5) / 2 = -1.45
    // halfKelly = max(0, -1.45 / 2) = 0

    expect(result.kellyFraction).toBeLessThan(0);
    expect(result.halfKellyFraction).toBe(0);
    expect(result.positionValue).toBe(0);
  });

  it('uses default estimates when no params are given beyond portfolio', () => {
    const result = kellyCriterionSize({ portfolioValue: 10000 });

    // Defaults: winRate=0.55, avgWinPct=3.0, avgLossPct=2.0
    // kelly = (0.55 * 3 - 0.45 * 2) / 3 = (1.65 - 0.9) / 3 = 0.25
    // halfKelly = 0.125

    expect(result.kellyFraction).toBeCloseTo(0.25, 4);
    expect(result.halfKellyFraction).toBeCloseTo(0.125, 4);
    expect(result.positionValue).toBeCloseTo(1250, 2);
  });
});

// ---- calculateRiskReward ---------------------------------------------------

describe('calculateRiskReward', () => {
  it('computes correct R:R ratio', () => {
    const result = calculateRiskReward({
      entryPrice: 100,
      stopLossPrice: 95,
      takeProfitPrice: 115,
    });

    // Risk = |100 - 95| = 5
    // Reward = |115 - 100| = 15
    // R:R = 15 / 5 = 3.0

    expect(result.risk).toBeCloseTo(5, 2);
    expect(result.reward).toBeCloseTo(15, 2);
    expect(result.ratio).toBeCloseTo(3, 2);
    expect(result.rating).toBe('excellent');
  });

  it('rates >= 2:1 as good', () => {
    const result = calculateRiskReward({
      entryPrice: 100,
      stopLossPrice: 95,
      takeProfitPrice: 110,
    });
    expect(result.ratio).toBeCloseTo(2, 2);
    expect(result.rating).toBe('good');
  });

  it('rates >= 1:1 as acceptable', () => {
    const result = calculateRiskReward({
      entryPrice: 100,
      stopLossPrice: 95,
      takeProfitPrice: 105,
    });
    expect(result.ratio).toBeCloseTo(1, 2);
    expect(result.rating).toBe('acceptable');
  });

  it('rates < 1:1 as poor', () => {
    const result = calculateRiskReward({
      entryPrice: 100,
      stopLossPrice: 95,
      takeProfitPrice: 102,
    });
    expect(result.ratio).toBeCloseTo(0.4, 2);
    expect(result.rating).toBe('poor');
  });

  it('handles short position (stop above entry, TP below)', () => {
    const result = calculateRiskReward({
      entryPrice: 100,
      stopLossPrice: 105,
      takeProfitPrice: 85,
    });

    // Risk = |100 - 105| = 5
    // Reward = |85 - 100| = 15
    // R:R = 3:1

    expect(result.ratio).toBeCloseTo(3, 2);
    expect(result.rating).toBe('excellent');
  });

  it('returns ratio 0 when risk is zero', () => {
    const result = calculateRiskReward({
      entryPrice: 100,
      stopLossPrice: 100,
      takeProfitPrice: 110,
    });
    expect(result.ratio).toBe(0);
  });
});

// ---- calculateLiquidationPrice ---------------------------------------------

describe('calculateLiquidationPrice', () => {
  it('computes LONG liquidation price', () => {
    const result = calculateLiquidationPrice({
      entryPrice: 100,
      leverage: 10,
      side: 'long',
      maintenanceMarginPct: 0.5,
    });

    // LONG: entry * (1 - 1/leverage + maintenance%)
    // = 100 * (1 - 0.1 + 0.005) = 100 * 0.905 = 90.5
    expect(result).toBeCloseTo(90.5, 2);
  });

  it('computes SHORT liquidation price', () => {
    const result = calculateLiquidationPrice({
      entryPrice: 100,
      leverage: 10,
      side: 'short',
      maintenanceMarginPct: 0.5,
    });

    // SHORT: entry * (1 + 1/leverage - maintenance%)
    // = 100 * (1 + 0.1 - 0.005) = 100 * 1.095 = 109.5
    expect(result).toBeCloseTo(109.5, 2);
  });

  it('uses default maintenance margin of 0.5%', () => {
    const resultLong = calculateLiquidationPrice({
      entryPrice: 50000,
      leverage: 20,
      side: 'long',
    });

    // LONG: 50000 * (1 - 1/20 + 0.005) = 50000 * 0.955 = 47750
    expect(resultLong).toBeCloseTo(47750, 0);
  });

  it('1x leverage long barely liquidates', () => {
    const result = calculateLiquidationPrice({
      entryPrice: 100,
      leverage: 1,
      side: 'long',
      maintenanceMarginPct: 0.5,
    });

    // LONG: 100 * (1 - 1 + 0.005) = 100 * 0.005 = 0.5
    expect(result).toBeCloseTo(0.5, 2);
  });
});
