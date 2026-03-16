import { describe, it, expect } from 'vitest';
import { runEvaluation } from './analysis.js';
import type { Market } from '../types/index.js';

function makeMarket(overrides: Partial<Market> = {}): Market {
  return {
    platform: 'polymarket',
    externalId: 'test-123',
    title: 'Will Bitcoin hit $100k by end of 2026?',
    description: 'Test market',
    category: 'crypto',
    resolutionType: 'binary',
    outcomes: [
      { label: 'Yes', price: 0.55 },
      { label: 'No', price: 0.45 },
    ],
    currentPrices: { yes: 0.55, no: 0.45 },
    volumeUsd: 500_000,
    liquidityUsd: 100_000,
    closeDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    status: 'open',
    url: 'https://polymarket.com/event/test-123',
    ...overrides,
  };
}

describe('runEvaluation', () => {
  it('returns BUY_YES for positive edge >= 5%', () => {
    const result = runEvaluation({
      market: makeMarket({ currentPrices: { yes: 0.40, no: 0.60 } }),
      estimatedProbability: 0.55,
      bankroll: 10_000,
    });
    expect(result.verdict).toBe('BUY_YES');
    expect(result.edge.pct).toBeCloseTo(15, 0);
    expect(result.edge.type).toBe('base_rate_deviation');
  });

  it('returns SKIP when no edge (no probability provided)', () => {
    const result = runEvaluation({
      market: makeMarket(),
      bankroll: 10_000,
    });
    expect(result.verdict).toBe('SKIP');
    expect(result.edge.type).toBe('none');
  });

  it('returns SKIP for small edge < 5%', () => {
    const result = runEvaluation({
      market: makeMarket({ currentPrices: { yes: 0.50, no: 0.50 } }),
      estimatedProbability: 0.53,
      bankroll: 10_000,
    });
    expect(result.verdict).toBe('SKIP');
  });

  it('applies Bayesian adjustments correctly', () => {
    const result = runEvaluation({
      market: makeMarket({ currentPrices: { yes: 0.40, no: 0.60 } }),
      bankroll: 10_000,
      adjustments: [
        { factor: 'polling', direction: 'up', magnitude: 0.3, reasoning: 'Strong data' },
      ],
    });
    // Base rate = 0.40, up by 0.3 → 0.40 + 0.60 * 0.3 = 0.58
    expect(result.evidence.estimatedProbability).toBeGreaterThan(0.50);
    expect(result.verdict).toBe('BUY_YES');
  });

  it('detects time_decay edge for near-certain expiry', () => {
    const closeDate = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const result = runEvaluation({
      market: makeMarket({
        currentPrices: { yes: 0.95, no: 0.05 },
        closeDate,
      }),
      estimatedProbability: 0.98,
      bankroll: 10_000,
    });
    expect(result.edge.type).toBe('time_decay');
  });

  it('score is bounded 0-100', () => {
    const result = runEvaluation({
      market: makeMarket({ currentPrices: { yes: 0.10, no: 0.90 } }),
      estimatedProbability: 0.90,
      bankroll: 10_000,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('includes Kelly sizing', () => {
    const result = runEvaluation({
      market: makeMarket({ currentPrices: { yes: 0.40, no: 0.60 } }),
      estimatedProbability: 0.55,
      bankroll: 10_000,
    });
    expect(result.sizing.recommended).toBeGreaterThan(0);
    expect(result.sizing.positionSize).toBeGreaterThan(0);
  });

  it('evidence object is fully populated', () => {
    const result = runEvaluation({
      market: makeMarket(),
      estimatedProbability: 0.60,
      bankroll: 10_000,
    });
    expect(result.evidence.baseRate).toBeDefined();
    expect(result.evidence.ev).toBeDefined();
    expect(result.evidence.kelly).toBeDefined();
    expect(result.evidence.efficiency).toBeDefined();
    expect(result.evidence.liquidity).toBeDefined();
    expect(result.evidence.daysToClose).toBeGreaterThan(0);
  });

  it('schemaVersion is 1.0', () => {
    const result = runEvaluation({
      market: makeMarket(),
      bankroll: 10_000,
    });
    expect(result.schemaVersion).toBe('1.0');
  });

  it('builds risks for low liquidity market', () => {
    const result = runEvaluation({
      market: makeMarket({ volumeUsd: 100, liquidityUsd: 50 }),
      estimatedProbability: 0.70,
      bankroll: 10_000,
    });
    expect(result.risks).toContain('Low liquidity — may face slippage');
  });

  it('returns BUY_NO for negative edge', () => {
    const result = runEvaluation({
      market: makeMarket({ currentPrices: { yes: 0.70, no: 0.30 } }),
      estimatedProbability: 0.55,
      bankroll: 10_000,
    });
    expect(result.verdict).toBe('BUY_NO');
    expect(result.edge.pct).toBeLessThan(0);
  });

  it('provenance includes platform and rulesetVersion', () => {
    const result = runEvaluation({
      market: makeMarket(),
      bankroll: 10_000,
    });
    expect(result.provenance.platform).toBe('polymarket');
    expect(result.provenance.rulesetVersion).toBe('1.0.0');
    expect(result.provenance.evaluatedAt).toBeTruthy();
  });

  it('detects liquidity_premium for low-liquidity market with edge', () => {
    const result = runEvaluation({
      market: makeMarket({
        currentPrices: { yes: 0.40, no: 0.60 },
        volumeUsd: 500,
        liquidityUsd: 200,
      }),
      estimatedProbability: 0.55,
      bankroll: 10_000,
    });
    expect(result.edge.type).toBe('liquidity_premium');
  });
});
