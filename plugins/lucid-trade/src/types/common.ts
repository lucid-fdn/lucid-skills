// ---------------------------------------------------------------------------
// common.ts -- Shared enums and primitive types for Lucid Trade
// ---------------------------------------------------------------------------

/** Supported centralized + decentralized exchanges */
export type ExchangeId =
  | 'binance'
  | 'bybit'
  | 'okx'
  | 'hyperliquid'
  | 'dydx'
  | 'jupiter'
  | 'raydium';

/** Supported blockchain networks */
export type Chain =
  | 'solana'
  | 'ethereum'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'polygon'
  | 'bsc'
  | 'avalanche';

/** Asset classification */
export type AssetType = 'spot' | 'perpetual' | 'futures' | 'option';

/** Order side */
export type OrderSide = 'buy' | 'sell';

/** Order type */
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';

/** Position direction */
export type PositionSide = 'long' | 'short';

/** Candlestick timeframes */
export type Timeframe =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

/** Capabilities an exchange adapter may support */
export type ExchangeCapability =
  | 'spot'
  | 'perpetual'
  | 'futures'
  | 'options'
  | 'margin'
  | 'lending'
  | 'staking'
  | 'orderbook'
  | 'ohlcv'
  | 'trades'
  | 'funding_rate'
  | 'open_interest'
  | 'ticker'
  | 'account_balance'
  | 'place_order'
  | 'cancel_order'
  | 'positions'
  | 'trader_discovery';
