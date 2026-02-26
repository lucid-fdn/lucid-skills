import { describe, it, expect, beforeAll } from 'vitest';
import { createBrainTools } from './tools.js';
import { PlatformRegistry } from '../adapters/registry.js';
import type { IPlatformAdapter } from '../adapters/types.js';
import type { Market, PlatformId } from '../types/index.js';
import type { ToolDefinition } from '../tools/index.js';
import { loadConfig } from '../config.js';

// Mock adapter
function makeMockAdapter(id: PlatformId = 'polymarket'): IPlatformAdapter {
  const market: Market = {
    platform: id,
    externalId: 'test-123',
    title: 'Will Bitcoin hit $100k by end of 2026?',
    description: 'Test market',
    category: 'crypto',
    resolutionType: 'binary',
    outcomes: [{ label: 'Yes', price: 0.55 }, { label: 'No', price: 0.45 }],
    currentPrices: { yes: 0.55, no: 0.45 },
    volumeUsd: 500_000,
    liquidityUsd: 100_000,
    closeDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    status: 'open',
    url: 'https://polymarket.com/event/test-123',
  };

  return {
    platformId: id,
    searchMarkets: async () => [market],
    getMarket: async () => market,
    getTrending: async () => [market],
    getMarketPrices: async () => ({ yes: 0.55, no: 0.45 }),
  };
}

describe('brain tools', () => {
  let tools: ToolDefinition[];
  let registry: PlatformRegistry;

  beforeAll(() => {
    registry = new PlatformRegistry();
    registry.register(makeMockAdapter('polymarket'));
    registry.register(makeMockAdapter('manifold'));
    const config = loadConfig({});
    tools = createBrainTools({ registry, config });
  });

  it('creates exactly 7 tools', () => {
    expect(tools).toHaveLength(7);
  });

  it('tool names match brain convention', () => {
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'lucid_arbitrage',
      'lucid_calibrate',
      'lucid_correlate',
      'lucid_discover',
      'lucid_evaluate',
      'lucid_pro',
      'lucid_size',
    ]);
  });

  describe('lucid_evaluate', () => {
    it('returns JSON by default with structured EvaluateResult', async () => {
      const evaluate = tools.find((t) => t.name === 'lucid_evaluate')!;
      const result = await evaluate.execute({ query: 'Bitcoin on polymarket', probability: 0.65 });
      const parsed = JSON.parse(result);
      expect(parsed.schemaVersion).toBe('1.0');
      expect(['BUY_YES', 'BUY_NO', 'SKIP', 'HEDGE']).toContain(parsed.verdict);
      expect(parsed.score).toBeGreaterThanOrEqual(0);
      expect(parsed.edge).toBeDefined();
      expect(parsed.sizing).toBeDefined();
    });

    it('returns text when format=text', async () => {
      const evaluate = tools.find((t) => t.name === 'lucid_evaluate')!;
      const result = await evaluate.execute({ query: 'Bitcoin', probability: 0.65, format: 'text' });
      expect(result).toContain('EDGE:');
      expect(result).toContain('EVIDENCE:');
      expect(result).toContain('SIZING:');
    });

    it('returns compact JSON when detail=compact', async () => {
      const evaluate = tools.find((t) => t.name === 'lucid_evaluate')!;
      const result = await evaluate.execute({ query: 'Bitcoin', probability: 0.65, detail: 'compact' });
      const parsed = JSON.parse(result);
      expect(parsed.evidence).toBeUndefined();
      expect(parsed.verdict).toBeDefined();
    });

    it('returns error for unfound market', async () => {
      const emptyRegistry = new PlatformRegistry();
      const config = loadConfig({});
      const emptyTools = createBrainTools({ registry: emptyRegistry, config });
      const evaluate = emptyTools.find((t) => t.name === 'lucid_evaluate')!;
      const result = await evaluate.execute({ query: 'nonexistent' });
      const parsed = JSON.parse(result);
      expect(parsed.error).toBeDefined();
    });
  });

  describe('lucid_discover', () => {
    it('returns discover results', async () => {
      const discover = tools.find((t) => t.name === 'lucid_discover')!;
      const result = await discover.execute({ query: 'crypto', minEdge: 0 });
      const parsed = JSON.parse(result);
      expect(parsed.scannedCount).toBeGreaterThan(0);
      expect(parsed.platformsSearched).toBeDefined();
    });
  });

  describe('lucid_calibrate', () => {
    it('returns calibration result', async () => {
      const calibrate = tools.find((t) => t.name === 'lucid_calibrate')!;
      const result = await calibrate.execute({
        forecasts: [
          { predictedProbability: 0.80, actualOutcome: 1 },
          { predictedProbability: 0.20, actualOutcome: 0 },
          { predictedProbability: 0.60, actualOutcome: 1 },
        ],
      });
      const parsed = JSON.parse(result);
      expect(parsed.brierScore).toBeDefined();
      expect(parsed.rating).toBeDefined();
      expect(['excellent', 'good', 'fair', 'poor']).toContain(parsed.rating);
    });

    it('returns error for empty forecasts', async () => {
      const calibrate = tools.find((t) => t.name === 'lucid_calibrate')!;
      const result = await calibrate.execute({ forecasts: [] });
      const parsed = JSON.parse(result);
      expect(parsed.error).toBeDefined();
    });
  });

  describe('lucid_size', () => {
    it('returns portfolio sizing', async () => {
      const size = tools.find((t) => t.name === 'lucid_size')!;
      const result = await size.execute({
        positions: [
          { price: 0.40, probability: 0.55, label: 'Market A' },
          { price: 0.60, probability: 0.70, label: 'Market B' },
        ],
        bankroll: 10_000,
      });
      const parsed = JSON.parse(result);
      expect(parsed.allocations).toHaveLength(2);
      expect(parsed.bankroll).toBe(10_000);
      expect(parsed.totalAllocated).toBeGreaterThan(0);
    });
  });

  describe('lucid_pro', () => {
    it('lists available tools', async () => {
      const pro = tools.find((t) => t.name === 'lucid_pro')!;
      const result = await pro.execute({ tool: 'list_tools' });
      const parsed = JSON.parse(result);
      expect(parsed.tools.length).toBeGreaterThan(10);
      expect(parsed.tools.map((t: { name: string }) => t.name)).toContain('expected_value');
      expect(parsed.tools.map((t: { name: string }) => t.name)).toContain('kelly_fraction');
    });

    it('executes a pro tool directly', async () => {
      const pro = tools.find((t) => t.name === 'lucid_pro')!;
      const result = await pro.execute({
        tool: 'expected_value',
        params: { stake: 100, price: 0.40, probability: 0.55 },
      });
      const parsed = JSON.parse(result);
      expect(parsed.ev).toBeCloseTo(37.5, 0);
      expect(parsed.isPositiveEv).toBe(true);
    });

    it('returns error for unknown tool', async () => {
      const pro = tools.find((t) => t.name === 'lucid_pro')!;
      const result = await pro.execute({ tool: 'nonexistent_tool' });
      expect(result).toContain('not found');
    });
  });

  describe('lucid_arbitrage', () => {
    it('runs without error', async () => {
      const arb = tools.find((t) => t.name === 'lucid_arbitrage')!;
      const result = await arb.execute({ query: 'crypto' });
      const parsed = JSON.parse(result);
      expect(parsed.platformsSearched).toBeDefined();
      expect(parsed.pairsScanned).toBeGreaterThanOrEqual(0);
    });
  });
});
