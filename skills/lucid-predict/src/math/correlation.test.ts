import { describe, it, expect } from 'vitest';
import { titleSimilarity, matchMarkets, calculateSpread, calculateArbitrage } from './correlation.js';
import type { Market } from '../types/index.js';

describe('titleSimilarity', () => {
  it('returns 1.0 for identical titles', () => {
    expect(titleSimilarity('Will Bitcoin hit $100k?', 'Will Bitcoin hit $100k?')).toBe(1.0);
  });

  it('returns 1.0 for titles differing only in punctuation', () => {
    expect(titleSimilarity('Will Bitcoin hit 100k?', 'Will Bitcoin hit 100k')).toBe(1.0);
  });

  it('returns high similarity for similar titles', () => {
    const score = titleSimilarity(
      'Will Bitcoin price exceed $100,000 by end of 2026?',
      'Will Bitcoin hit $100,000 in 2026?',
    );
    expect(score).toBeGreaterThan(0.4);
  });

  it('returns low similarity for unrelated titles', () => {
    const score = titleSimilarity(
      'Will Bitcoin hit $100k?',
      'Who will win the Super Bowl?',
    );
    expect(score).toBeLessThan(0.3);
  });

  it('handles empty strings', () => {
    expect(titleSimilarity('', 'test')).toBe(0);
  });
});

describe('calculateSpread', () => {
  it('calculates positive spread', () => {
    expect(calculateSpread(0.40, 0.45)).toBeCloseTo(12.5, 1);
  });

  it('returns 0 for equal prices', () => {
    expect(calculateSpread(0.50, 0.50)).toBe(0);
  });

  it('handles zero price', () => {
    expect(calculateSpread(0, 0.50)).toBe(0);
  });
});

describe('calculateArbitrage', () => {
  it('detects arbitrage when combined cost < 1', () => {
    const result = calculateArbitrage(0.40, 0.50);
    expect(result).not.toBeNull();
    expect(result!.combinedCost).toBe(0.90);
    expect(result!.profit).toBeCloseTo(0.10, 2);
    expect(result!.profitPct).toBeCloseTo(11.11, 1);
  });

  it('returns null when no arbitrage exists', () => {
    expect(calculateArbitrage(0.55, 0.50)).toBeNull();
  });

  it('returns null when combined cost equals 1', () => {
    expect(calculateArbitrage(0.50, 0.50)).toBeNull();
  });
});

describe('matchMarkets', () => {
  const makeMarket = (platform: string, title: string, price: number): Market => ({
    platform: platform as any,
    externalId: `${platform}-${title.slice(0, 10)}`,
    title,
    description: '',
    category: 'politics',
    resolutionType: 'binary',
    outcomes: [{ label: 'Yes', price }, { label: 'No', price: 1 - price }],
    currentPrices: { yes: price, no: 1 - price },
    volumeUsd: 100_000,
    liquidityUsd: 50_000,
    closeDate: '2026-12-31T00:00:00Z',
    status: 'open',
    url: `https://${platform}.com/market/1`,
  });

  it('matches similar markets across platforms', () => {
    const marketsA = [makeMarket('polymarket', 'Will Bitcoin hit $100k in 2026?', 0.55)];
    const marketsB = [makeMarket('manifold', 'Will Bitcoin hit $100k in 2026?', 0.60)];
    const pairs = matchMarkets(marketsA, marketsB);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.similarity).toBe(1.0);
  });

  it('filters below threshold', () => {
    const marketsA = [makeMarket('polymarket', 'Will Bitcoin hit $100k?', 0.55)];
    const marketsB = [makeMarket('manifold', 'Who will win the Super Bowl?', 0.60)];
    const pairs = matchMarkets(marketsA, marketsB);
    expect(pairs).toHaveLength(0);
  });
});
