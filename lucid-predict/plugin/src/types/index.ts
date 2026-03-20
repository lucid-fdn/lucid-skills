// ---------------------------------------------------------------------------
// types/index.ts -- Core type definitions for Lucid Predict
// ---------------------------------------------------------------------------

/** Supported prediction market platforms */
export type PlatformId = 'polymarket' | 'manifold' | 'kalshi';

/** Market resolution types */
export type ResolutionType = 'binary' | 'multiple_choice' | 'scalar';

/** Market statuses */
export type MarketStatus = 'open' | 'closed' | 'resolved' | 'disputed';

/** Market categories */
export type MarketCategory =
  | 'politics' | 'crypto' | 'sports' | 'science'
  | 'economics' | 'technology' | 'entertainment'
  | 'world_events' | 'other';

/** A single outcome in a market */
export interface Outcome {
  label: string;
  price: number; // 0-1
}

/** Unified prediction market model (normalized across all platforms) */
export interface Market {
  platform: PlatformId;
  externalId: string;
  title: string;
  description: string;
  category: MarketCategory;
  resolutionType: ResolutionType;
  outcomes: Outcome[];
  currentPrices: { yes: number; no: number };
  volumeUsd: number;
  liquidityUsd: number;
  closeDate: string; // ISO 8601
  status: MarketStatus;
  url: string;
}

/** Historical price point */
export interface PricePoint {
  timestamp: number;
  price: number;
}

/** A resolved market with outcome info */
export interface ResolvedMarket extends Market {
  resolvedOutcome: string;
  resolvedAt: string; // ISO 8601
}

/** Matched market pair (for arbitrage/correlation) */
export interface MatchedPair {
  marketA: Market;
  marketB: Market;
  similarity: number; // 0-1 title similarity
}

/** Odds format for conversion */
export type OddsFormat = 'probability' | 'decimal' | 'american' | 'fractional';

/** A forecast for calibration tracking */
export interface Forecast {
  predictedProbability: number;
  actualOutcome: 0 | 1;
  category?: string;
}
