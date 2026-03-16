import { describe, it, expect } from 'vitest';
import { brierScore, calibrationBuckets, overconfidenceScore } from './brier.js';
import type { Forecast } from '../types/index.js';

describe('brierScore', () => {
  it('returns 0 for perfect predictions', () => {
    const forecasts: Forecast[] = [
      { predictedProbability: 1.0, actualOutcome: 1 },
      { predictedProbability: 0.0, actualOutcome: 0 },
    ];
    expect(brierScore(forecasts)).toBe(0);
  });

  it('returns 1 for worst predictions', () => {
    const forecasts: Forecast[] = [
      { predictedProbability: 1.0, actualOutcome: 0 },
      { predictedProbability: 0.0, actualOutcome: 1 },
    ];
    expect(brierScore(forecasts)).toBe(1);
  });

  it('returns 0.25 for 50/50 predictions on random outcomes', () => {
    const forecasts: Forecast[] = [
      { predictedProbability: 0.5, actualOutcome: 1 },
      { predictedProbability: 0.5, actualOutcome: 0 },
    ];
    expect(brierScore(forecasts)).toBeCloseTo(0.25, 2);
  });

  it('returns 0 for empty array', () => {
    expect(brierScore([])).toBe(0);
  });
});

describe('calibrationBuckets', () => {
  it('groups forecasts into buckets', () => {
    const forecasts: Forecast[] = [
      { predictedProbability: 0.75, actualOutcome: 1 },
      { predictedProbability: 0.72, actualOutcome: 0 },
      { predictedProbability: 0.25, actualOutcome: 0 },
    ];
    const buckets = calibrationBuckets(forecasts);
    expect(buckets.length).toBeGreaterThan(0);
    // The 0.7-0.8 bucket should have 2 entries
    const b70 = buckets.find((b) => b.range === '0.7-0.8');
    expect(b70?.count).toBe(2);
  });

  it('returns empty for no forecasts', () => {
    expect(calibrationBuckets([])).toEqual([]);
  });
});

describe('overconfidenceScore', () => {
  it('returns positive for overconfident predictions', () => {
    const buckets = [
      { range: '0.7-0.8', predicted: 0.75, actual: 0.50, count: 10, deviation: 0.25 },
    ];
    expect(overconfidenceScore(buckets)).toBeGreaterThan(0);
  });

  it('returns negative for underconfident predictions', () => {
    const buckets = [
      { range: '0.3-0.4', predicted: 0.35, actual: 0.60, count: 10, deviation: 0.25 },
    ];
    expect(overconfidenceScore(buckets)).toBeLessThan(0);
  });
});
