import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManifoldAdapter } from './manifold.js';

const mockResponse = (data: any) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);

describe('ManifoldAdapter', () => {
  let adapter: ManifoldAdapter;

  beforeEach(() => {
    adapter = new ManifoldAdapter('https://mock-manifold.test');
    vi.stubGlobal('fetch', vi.fn());
  });

  it('has correct platformId', () => {
    expect(adapter.platformId).toBe('manifold');
  });

  it('searchMarkets normalizes response', async () => {
    (globalThis.fetch as any).mockReturnValue(mockResponse([{
      id: 'abc123',
      question: 'Will AI pass the Turing test by 2030?',
      probability: 0.42,
      volume: 25000,
      totalLiquidity: 8000,
      closeTime: 1893456000000,
      isResolved: false,
      outcomeType: 'BINARY',
      url: 'https://manifold.markets/user/ai-turing-2030',
    }]));

    const results = await adapter.searchMarkets('AI Turing');
    expect(results).toHaveLength(1);
    expect(results[0]!.platform).toBe('manifold');
    expect(results[0]!.title).toBe('Will AI pass the Turing test by 2030?');
    expect(results[0]!.currentPrices.yes).toBeCloseTo(0.42, 2);
    expect(results[0]!.status).toBe('open');
  });

  it('getMarket returns normalized market', async () => {
    (globalThis.fetch as any).mockReturnValue(mockResponse({
      id: 'def456',
      question: 'Will Mars colony exist by 2040?',
      probability: 0.08,
      volume: 5000,
      totalLiquidity: 2000,
      isResolved: false,
      outcomeType: 'BINARY',
    }));

    const market = await adapter.getMarket('def456');
    expect(market.externalId).toBe('def456');
    expect(market.currentPrices.yes).toBeCloseTo(0.08, 2);
  });
});
