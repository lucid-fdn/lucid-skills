import { describe, it, expect } from 'vitest';
import { convertOdds, impliedProbability } from './odds.js';

describe('convertOdds', () => {
  it('converts probability to decimal', () => {
    expect(convertOdds(0.60, 'probability', 'decimal')).toBeCloseTo(1.667, 2);
  });

  it('converts decimal to probability', () => {
    expect(convertOdds(2.50, 'decimal', 'probability')).toBeCloseTo(0.40, 2);
  });

  it('converts decimal to positive american', () => {
    expect(convertOdds(2.50, 'decimal', 'american')).toBeCloseTo(150, 0);
  });

  it('converts decimal to negative american', () => {
    expect(convertOdds(1.50, 'decimal', 'american')).toBeCloseTo(-200, 0);
  });

  it('converts positive american to decimal', () => {
    expect(convertOdds(150, 'american', 'decimal')).toBeCloseTo(2.50, 2);
  });

  it('converts negative american to decimal', () => {
    expect(convertOdds(-200, 'american', 'decimal')).toBeCloseTo(1.50, 2);
  });

  it('converts fractional to decimal', () => {
    // 3/1 fractional = 4.0 decimal
    expect(convertOdds(3, 'fractional', 'decimal')).toBeCloseTo(4.0, 2);
  });

  it('returns same value for identity conversion', () => {
    expect(convertOdds(0.55, 'probability', 'probability')).toBe(0.55);
  });
});

describe('impliedProbability', () => {
  it('returns price as probability', () => {
    expect(impliedProbability(0.65)).toBe(0.65);
  });

  it('clamps to 0-1', () => {
    expect(impliedProbability(-0.1)).toBe(0);
    expect(impliedProbability(1.5)).toBe(1);
  });
});
