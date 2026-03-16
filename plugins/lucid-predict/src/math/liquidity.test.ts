import { describe, it, expect } from 'vitest';
import { liquidityScore } from './liquidity.js';

describe('liquidityScore', () => {
  it('returns 100 for high volume and liquidity', () => {
    const r = liquidityScore(200_000, 100_000);
    expect(r.score).toBe(100);
    expect(r.rating).toBe('high');
  });

  it('returns 0 for zero volume and liquidity', () => {
    const r = liquidityScore(0, 0);
    expect(r.score).toBe(0);
    expect(r.rating).toBe('low');
  });

  it('returns medium for moderate values', () => {
    const r = liquidityScore(50_000, 25_000);
    expect(r.score).toBe(50);
    expect(r.rating).toBe('medium');
  });

  it('caps each component at 50', () => {
    const r = liquidityScore(1_000_000, 1_000_000);
    expect(r.volumeComponent).toBe(50);
    expect(r.liquidityComponent).toBe(50);
  });

  it('handles negative values gracefully', () => {
    const r = liquidityScore(-100, -50);
    expect(r.score).toBe(0);
  });
});
