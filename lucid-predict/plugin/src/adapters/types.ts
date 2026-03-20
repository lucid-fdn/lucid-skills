// ---------------------------------------------------------------------------
// adapters/types.ts -- IPlatformAdapter interface
// ---------------------------------------------------------------------------

import type { PlatformId, Market, PricePoint } from '../types/index.js';

/** Universal prediction market platform adapter interface. */
export interface IPlatformAdapter {
  readonly platformId: PlatformId;

  /** Search markets by query string */
  searchMarkets(query: string, limit?: number): Promise<Market[]>;

  /** Fetch a single market by platform-specific ID */
  getMarket(externalId: string): Promise<Market>;

  /** Fetch trending / popular markets */
  getTrending(limit?: number): Promise<Market[]>;

  /** Fetch current YES/NO prices for a market */
  getMarketPrices(externalId: string): Promise<{ yes: number; no: number }>;

  /** Fetch price history (optional -- not all platforms support) */
  getPriceHistory?(externalId: string): Promise<PricePoint[]>;

  /** Fetch recently resolved markets (optional) */
  getResolvedMarkets?(limit?: number): Promise<Market[]>;
}
