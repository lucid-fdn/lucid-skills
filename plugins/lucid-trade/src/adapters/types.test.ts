// ---------------------------------------------------------------------------
// adapters/types.test.ts -- Type-check tests for core types and adapter
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import type { ExchangeId, ExchangeCapability } from '../types/index.js';
import type { IExchangeAdapter, AdapterConfig } from './types.js';

describe('Core Types', () => {
  it('ExchangeId covers all 7 exchanges', () => {
    const exchanges: ExchangeId[] = [
      'binance',
      'bybit',
      'okx',
      'hyperliquid',
      'dydx',
      'jupiter',
      'raydium',
    ];
    expect(exchanges).toHaveLength(7);
    // Each value is a valid string
    for (const ex of exchanges) {
      expect(typeof ex).toBe('string');
    }
  });

  it('ExchangeCapability covers market, execution, and account caps', () => {
    const caps: ExchangeCapability[] = [
      'spot',
      'perpetual',
      'futures',
      'options',
      'margin',
      'lending',
      'staking',
      'orderbook',
      'ohlcv',
      'trades',
      'funding_rate',
      'open_interest',
      'ticker',
      'account_balance',
      'place_order',
      'cancel_order',
      'positions',
      'trader_discovery',
    ];
    expect(caps).toHaveLength(18);
    // No duplicates
    expect(new Set(caps).size).toBe(caps.length);
  });

  it('AdapterConfig requires exchangeId but credentials are optional', () => {
    // Minimal config -- only exchangeId is required
    const minimal: AdapterConfig = { exchangeId: 'binance' };
    expect(minimal.exchangeId).toBe('binance');
    expect(minimal.apiKey).toBeUndefined();
    expect(minimal.apiSecret).toBeUndefined();

    // Full config
    const full: AdapterConfig = {
      exchangeId: 'bybit',
      apiKey: 'key',
      apiSecret: 'secret',
      passphrase: 'pass',
      subaccount: 'sub1',
      testnet: true,
      rateLimit: 100,
    };
    expect(full.exchangeId).toBe('bybit');
    expect(full.testnet).toBe(true);

    // Type guard: IExchangeAdapter shape check (compile-time only,
    // we just verify the interface is importable and has the right shape)
    const _adapterCheck: Pick<IExchangeAdapter, 'exchangeId' | 'capabilities'> = {
      exchangeId: 'okx',
      capabilities: new Set<ExchangeCapability>(['spot', 'perpetual', 'ohlcv']),
    };
    expect(_adapterCheck.capabilities.has('spot')).toBe(true);
  });
});
