import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolymarketAdapter } from './polymarket.js';

const mockResponse = (data: any) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);

describe('PolymarketAdapter', () => {
  let adapter: PolymarketAdapter;

  beforeEach(() => {
    adapter = new PolymarketAdapter('https://mock-api.test');
    vi.stubGlobal('fetch', vi.fn());
  });

  it('has correct platformId', () => {
    expect(adapter.platformId).toBe('polymarket');
  });

  it('searchMarkets normalizes response', async () => {
    (globalThis.fetch as any).mockReturnValue(mockResponse([{
      id: '123',
      question: 'Will BTC hit $100k?',
      description: 'Bitcoin price market',
      outcomePrices: '["0.65","0.35"]',
      volume: 500000,
      liquidity: 100000,
      endDate: '2026-12-31T00:00:00Z',
      active: true,
      slug: 'btc-100k',
    }]));

    const results = await adapter.searchMarkets('BTC');
    expect(results).toHaveLength(1);
    expect(results[0]!.platform).toBe('polymarket');
    expect(results[0]!.title).toBe('Will BTC hit $100k?');
    expect(results[0]!.currentPrices.yes).toBeCloseTo(0.65, 2);
    expect(results[0]!.currentPrices.no).toBeCloseTo(0.35, 2);
    expect(results[0]!.status).toBe('open');
  });

  it('getMarket returns single normalized market', async () => {
    (globalThis.fetch as any).mockReturnValue(mockResponse({
      id: '456',
      question: 'Will ETH flip BTC?',
      description: '',
      outcomePrices: [0.15, 0.85],
      volume: 10000,
      liquidity: 5000,
      endDate: '2027-01-01T00:00:00Z',
      active: true,
    }));

    const market = await adapter.getMarket('456');
    expect(market.externalId).toBe('456');
    expect(market.currentPrices.yes).toBeCloseTo(0.15, 2);
  });

  it('getMarketPrices returns prices', async () => {
    (globalThis.fetch as any).mockReturnValue(mockResponse({
      id: '789',
      question: 'test',
      outcomePrices: '["0.70","0.30"]',
      active: true,
    }));

    const prices = await adapter.getMarketPrices('789');
    expect(prices.yes).toBeCloseTo(0.70, 2);
    expect(prices.no).toBeCloseTo(0.30, 2);
  });
});
