import { describe, it, expect } from 'vitest';
import { kellyFraction } from './kelly.js';

describe('kellyFraction', () => {
  it('computes correct Kelly for 15% edge example', () => {
    // price=0.40, prob=0.55, bankroll=$10k
    const r = kellyFraction(0.40, 0.55, 10_000);
    expect(r.fullKelly).toBeCloseTo(0.25, 2);
    expect(r.halfKelly).toBeCloseTo(0.125, 2);
    expect(r.recommended).toBeCloseTo(0.125, 2);
    expect(r.positionSize).toBeCloseTo(1250, 0);
    expect(r.shouldBet).toBe(true);
  });

  it('returns zero for no edge (price == probability)', () => {
    const r = kellyFraction(0.50, 0.50, 10_000);
    expect(r.fullKelly).toBe(0);
    expect(r.shouldBet).toBe(false);
  });

  it('returns zero for negative edge', () => {
    const r = kellyFraction(0.60, 0.50, 10_000);
    expect(r.fullKelly).toBe(0);
    expect(r.shouldBet).toBe(false);
  });

  it('caps at maxFraction', () => {
    // Very high edge: price=0.10, prob=0.90
    const r = kellyFraction(0.10, 0.90, 10_000, 0.25);
    expect(r.recommended).toBeLessThanOrEqual(0.25);
  });

  it('handles boundary prices', () => {
    expect(kellyFraction(0, 0.5, 10_000).shouldBet).toBe(false);
    expect(kellyFraction(1, 0.5, 10_000).shouldBet).toBe(false);
  });

  it('handles zero bankroll', () => {
    expect(kellyFraction(0.40, 0.55, 0).positionSize).toBe(0);
  });

  it('uses half-Kelly for conservative sizing by default', () => {
    const r = kellyFraction(0.30, 0.50, 10_000);
    expect(r.recommended).toBe(r.halfKelly);
  });
});
