// ---------------------------------------------------------------------------
// types/index.ts -- Barrel export for all Lucid Trade types
// ---------------------------------------------------------------------------

export type {
  ExchangeId,
  Chain,
  AssetType,
  OrderSide,
  OrderType,
  PositionSide,
  Timeframe,
  ExchangeCapability,
} from './common.js';

export type {
  OHLCV,
  OrderbookLevel,
  Orderbook,
  FundingRate,
  OpenInterest,
  Price,
  Instrument,
  Ticker,
  Trade,
  CandleParams,
} from './market.js';

export type {
  Position,
  Order,
  ClosedTrade,
  Balance,
  OpenPositionParams,
  ClosePositionParams,
  OrderParams,
  OrderResult,
  SpotSwapParams,
  SwapQuote,
} from './trading.js';

export type {
  RiskLevel,
  AllocationEntry,
  PerformanceMetrics,
  PortfolioOverview,
  TraderProfile,
} from './portfolio.js';
