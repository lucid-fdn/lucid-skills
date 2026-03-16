import { describe, it, expect } from 'vitest';
import { PlatformRegistry } from './registry.js';
import type { IPlatformAdapter } from './types.js';
import type { PlatformId } from '../types/index.js';

function makeMockAdapter(id: PlatformId): IPlatformAdapter {
  return {
    platformId: id,
    searchMarkets: async () => [],
    getMarket: async () => ({ platform: id, externalId: '1', title: 'test', description: '', category: 'other', resolutionType: 'binary', outcomes: [], currentPrices: { yes: 0.5, no: 0.5 }, volumeUsd: 0, liquidityUsd: 0, closeDate: '', status: 'open', url: '' }),
    getTrending: async () => [],
    getMarketPrices: async () => ({ yes: 0.5, no: 0.5 }),
  };
}

describe('PlatformRegistry', () => {
  it('registers and retrieves adapters', () => {
    const reg = new PlatformRegistry();
    const adapter = makeMockAdapter('polymarket');
    reg.register(adapter);
    expect(reg.get('polymarket')).toBe(adapter);
  });

  it('returns undefined for unregistered platform', () => {
    const reg = new PlatformRegistry();
    expect(reg.get('kalshi')).toBeUndefined();
  });

  it('lists all adapters', () => {
    const reg = new PlatformRegistry();
    reg.register(makeMockAdapter('polymarket'));
    reg.register(makeMockAdapter('manifold'));
    expect(reg.list()).toHaveLength(2);
  });

  it('reports correct size', () => {
    const reg = new PlatformRegistry();
    expect(reg.size).toBe(0);
    reg.register(makeMockAdapter('polymarket'));
    expect(reg.size).toBe(1);
  });

  it('overwrites adapter for same platform', () => {
    const reg = new PlatformRegistry();
    const a1 = makeMockAdapter('polymarket');
    const a2 = makeMockAdapter('polymarket');
    reg.register(a1);
    reg.register(a2);
    expect(reg.size).toBe(1);
    expect(reg.get('polymarket')).toBe(a2);
  });
});
