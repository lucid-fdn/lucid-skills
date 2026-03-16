// ---------------------------------------------------------------------------
// market.ts -- Market data types for Lucid Trade
// ---------------------------------------------------------------------------

import type { ExchangeId, Timeframe } from './common.js';

/** OHLCV candlestick */
export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Orderbook level [price, quantity] */
export type OrderbookLevel = [price: number, quantity: number];

/** Full orderbook snapshot */
export interface Orderbook {
  exchange: ExchangeId;
  symbol: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  timestamp: number;
}

/** Funding rate for perpetuals */
export interface FundingRate {
  exchange: ExchangeId;
  symbol: string;
  rate: number;
  nextFundingTime: number;
  timestamp: number;
}

/** Open interest for derivatives */
export interface OpenInterest {
  exchange: ExchangeId;
  symbol: string;
  openInterest: number;
  openInterestValue: number;
  timestamp: number;
}

/** Spot price */
export interface Price {
  exchange: ExchangeId;
  symbol: string;
  price: number;
  timestamp: number;
}

/** Instrument metadata */
export interface Instrument {
  exchange: ExchangeId;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  type: 'spot' | 'perpetual' | 'futures' | 'option';
  tickSize: number;
  lotSize: number;
  minNotional: number;
  maxLeverage?: number;
  contractSize?: number;
  settlementAsset?: string;
}

/** Ticker data */
export interface Ticker {
  exchange: ExchangeId;
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  change24h: number;
  changePct24h: number;
  timestamp: number;
}

/** Single trade */
export interface Trade {
  exchange: ExchangeId;
  symbol: string;
  id: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

/** Parameters for fetching candles */
export interface CandleParams {
  exchange: ExchangeId;
  symbol: string;
  timeframe: Timeframe;
  limit?: number;
  since?: number;
}
