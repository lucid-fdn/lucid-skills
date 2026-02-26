import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KalshiAdapter } from './kalshi.js';

const mockResponse = (data: any) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);

describe('KalshiAdapter', () => {
  it('has correct platformId', () => {
    const adapter = new KalshiAdapter();
    expect(adapter.platformId).toBe('kalshi');
  });

  describe('without API key', () => {
    it('searchMarkets returns empty array', async () => {
      const adapter = new KalshiAdapter();
      const results = await adapter.searchMarkets('test');
      expect(results).toEqual([]);
    });

    it('getTrending returns empty array', async () => {
      const adapter = new KalshiAdapter();
      const results = await adapter.getTrending();
      expect(results).toEqual([]);
    });

    it('getMarket throws error', async () => {
      const adapter = new KalshiAdapter();
      await expect(adapter.getMarket('test')).rejects.toThrow('Kalshi API key required');
    });
  });

  describe('with API key', () => {
    let adapter: KalshiAdapter;

    beforeEach(() => {
      adapter = new KalshiAdapter('https://mock-kalshi.test', 'test-key');
      vi.stubGlobal('fetch', vi.fn());
    });

    it('searchMarkets normalizes response', async () => {
      (globalThis.fetch as any).mockReturnValue(mockResponse({
        markets: [{
          ticker: 'PRES-2028-DEM',
          title: 'Will a Democrat win the 2028 election?',
          yes_bid: 45,
          volume: 1000000,
          open_interest: 500000,
          close_time: '2028-11-05T00:00:00Z',
          status: 'open',
          category: 'Politics',
        }],
      }));

      const results = await adapter.searchMarkets('Democrat');
      expect(results).toHaveLength(1);
      expect(results[0]!.platform).toBe('kalshi');
      expect(results[0]!.currentPrices.yes).toBeCloseTo(0.45, 2);
      expect(results[0]!.externalId).toBe('PRES-2028-DEM');
    });
  });
});
