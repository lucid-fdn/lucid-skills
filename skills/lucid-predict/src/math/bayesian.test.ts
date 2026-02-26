import { describe, it, expect } from 'vitest';
import { estimateProbability, bayesianUpdate } from './bayesian.js';

describe('estimateProbability', () => {
  it('returns base rate with no adjustments', () => {
    expect(estimateProbability(0.50, [])).toBeCloseTo(0.50, 2);
  });

  it('adjusts upward', () => {
    const result = estimateProbability(0.50, [
      { factor: 'polling', direction: 'up', magnitude: 0.3, reasoning: 'Strong polling lead' },
    ]);
    expect(result).toBeGreaterThan(0.50);
    expect(result).toBeCloseTo(0.65, 2);
  });

  it('adjusts downward', () => {
    const result = estimateProbability(0.70, [
      { factor: 'scandal', direction: 'down', magnitude: 0.2, reasoning: 'Recent scandal' },
    ]);
    expect(result).toBeLessThan(0.70);
    expect(result).toBeCloseTo(0.56, 2);
  });

  it('never exceeds 0.99', () => {
    const result = estimateProbability(0.95, [
      { factor: 'a', direction: 'up', magnitude: 0.9, reasoning: '' },
      { factor: 'b', direction: 'up', magnitude: 0.9, reasoning: '' },
    ]);
    expect(result).toBeLessThanOrEqual(0.99);
  });

  it('never goes below 0.01', () => {
    const result = estimateProbability(0.05, [
      { factor: 'a', direction: 'down', magnitude: 0.9, reasoning: '' },
      { factor: 'b', direction: 'down', magnitude: 0.9, reasoning: '' },
    ]);
    expect(result).toBeGreaterThanOrEqual(0.01);
  });

  it('handles multiple adjustments', () => {
    const result = estimateProbability(0.50, [
      { factor: 'polling', direction: 'up', magnitude: 0.2, reasoning: '' },
      { factor: 'economy', direction: 'down', magnitude: 0.1, reasoning: '' },
    ]);
    // Up 20% of remaining, then down 10% of current
    expect(result).toBeGreaterThan(0.50);
  });
});

describe('bayesianUpdate', () => {
  it('increases probability with likelihood > 1', () => {
    expect(bayesianUpdate(0.50, 3.0)).toBeGreaterThan(0.50);
  });

  it('decreases probability with likelihood < 1', () => {
    expect(bayesianUpdate(0.50, 0.3)).toBeLessThan(0.50);
  });

  it('returns same with likelihood = 1', () => {
    expect(bayesianUpdate(0.50, 1.0)).toBeCloseTo(0.50, 4);
  });

  it('converges toward 1 with strong evidence', () => {
    expect(bayesianUpdate(0.50, 100)).toBeGreaterThan(0.98);
  });
});
