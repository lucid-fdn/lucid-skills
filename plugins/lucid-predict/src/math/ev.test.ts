import { describe, it, expect } from 'vitest';
import { expectedValue } from './ev.js';

describe('expectedValue', () => {
  it('calculates positive EV with 15% edge', () => {
    // Stake $100, market at 0.40, true prob 0.55
    const r = expectedValue(100, 0.40, 0.55);
    expect(r.payout).toBeCloseTo(250, 1);
    expect(r.expectedPayout).toBeCloseTo(137.5, 1);
    expect(r.ev).toBeCloseTo(37.5, 1);
    expect(r.roiPct).toBeCloseTo(37.5, 1);
    expect(r.edgePct).toBeCloseTo(15, 1);
    expect(r.isPositiveEv).toBe(true);
  });

  it('returns negative EV when market is correct', () => {
    const r = expectedValue(100, 0.60, 0.55);
    expect(r.ev).toBeLessThan(0);
    expect(r.isPositiveEv).toBe(false);
  });

  it('returns zero EV when estimate equals price', () => {
    const r = expectedValue(100, 0.50, 0.50);
    expect(r.ev).toBeCloseTo(0, 5);
    expect(r.edgePct).toBeCloseTo(0, 5);
  });

  it('handles edge case of price at boundary', () => {
    const r0 = expectedValue(100, 0, 0.5);
    expect(r0.ev).toBe(0);
    const r1 = expectedValue(100, 1, 0.5);
    expect(r1.ev).toBe(0);
  });

  it('handles zero stake', () => {
    const r = expectedValue(0, 0.40, 0.55);
    expect(r.ev).toBe(0);
    expect(r.roiPct).toBe(0);
    expect(r.isPositiveEv).toBe(false);
  });

  it('handles negative stake', () => {
    const r = expectedValue(-50, 0.40, 0.55);
    expect(r.ev).toBe(0);
    expect(r.payout).toBe(0);
    expect(r.isPositiveEv).toBe(false);
  });
});
