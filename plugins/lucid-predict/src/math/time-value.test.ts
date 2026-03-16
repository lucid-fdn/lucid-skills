import { describe, it, expect } from 'vitest';
import { daysToClose, timeDecayScore, isNearCertainExpiry } from './time-value.js';

describe('daysToClose', () => {
  it('returns positive days for future date', () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    expect(daysToClose(future)).toBe(5);
  });

  it('returns 0 for past date', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(daysToClose(past)).toBe(0);
  });
});

describe('timeDecayScore', () => {
  it('gives high score for near-expiry high-probability', () => {
    const score = timeDecayScore(3, 0.95);
    expect(score).toBeGreaterThan(90);
  });

  it('gives low score for far-out uncertain market', () => {
    const score = timeDecayScore(180, 0.50);
    expect(score).toBeLessThan(30);
  });

  it('returns 0 for expired market', () => {
    expect(timeDecayScore(0, 0.95)).toBe(0);
  });
});

describe('isNearCertainExpiry', () => {
  it('returns true for 3-day 95% market', () => {
    expect(isNearCertainExpiry(3, 0.95)).toBe(true);
  });

  it('returns false for 30-day 95% market', () => {
    expect(isNearCertainExpiry(30, 0.95)).toBe(false);
  });

  it('returns false for 3-day 50% market', () => {
    expect(isNearCertainExpiry(3, 0.50)).toBe(false);
  });

  it('returns false for expired market', () => {
    expect(isNearCertainExpiry(0, 0.99)).toBe(false);
  });
});
