import { describe, it, expect } from 'vitest';
import { analyzeEfficiency } from './efficiency.js';

describe('analyzeEfficiency', () => {
  it('detects a fair market (prices sum to 1)', () => {
    const r = analyzeEfficiency([0.55, 0.45]);
    expect(r.overround).toBeCloseTo(0, 1);
    expect(r.isEfficient).toBe(true);
  });

  it('detects overround (prices sum > 1)', () => {
    const r = analyzeEfficiency([0.55, 0.52]);
    expect(r.overround).toBeGreaterThan(0);
    expect(r.vig).toBeGreaterThan(0);
  });

  it('detects underround (prices sum < 1) — possible arbitrage', () => {
    const r = analyzeEfficiency([0.45, 0.48]);
    expect(r.overround).toBeLessThan(0);
  });

  it('calculates fair prices that sum to 1', () => {
    const r = analyzeEfficiency([0.55, 0.52]);
    const sum = r.fairPrices.reduce((s, p) => s + p, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it('handles multiple outcomes', () => {
    const r = analyzeEfficiency([0.30, 0.25, 0.25, 0.25]);
    expect(r.overround).toBeCloseTo(5, 0);
    expect(r.fairPrices).toHaveLength(4);
  });

  it('marks inefficient market (overround > 5%)', () => {
    const r = analyzeEfficiency([0.60, 0.55]);
    expect(r.isEfficient).toBe(false);
  });

  it('handles empty prices array', () => {
    const r = analyzeEfficiency([]);
    expect(r.overround).toBe(0);
    expect(r.isEfficient).toBe(true);
  });
});
