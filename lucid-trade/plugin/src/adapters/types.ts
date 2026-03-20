// ---------------------------------------------------------------------------
// adapters/types.ts -- IExchangeAdapter interface and adapter config
// ---------------------------------------------------------------------------

import type {
  ExchangeId,
  ExchangeCapability,
  OHLCV,
  Orderbook,
  FundingRate,
  OpenInterest,
  Price,
  Instrument,
  Ticker,
  Trade,
  CandleParams,
  Position,
  Order,
  Balance,
  OrderParams,
  OrderResult,
  ClosePositionParams,
  OpenPositionParams,
  SpotSwapParams,
  SwapQuote,
  TraderProfile,
  Timeframe,
} from '../types/index.js';

/** Configuration for an exchange adapter */
export interface AdapterConfig {
  exchangeId: ExchangeId;
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  subaccount?: string;
  testnet?: boolean;
  rateLimit?: number;
}

/**
 * Universal exchange adapter interface.
 *
 * Market data methods are required -- every adapter must provide read access.
 * Execution, account, and trader discovery methods are optional since not all
 * exchanges support all features (e.g. DEXes lack account/order management,
 * not all CEXes expose trader leaderboards).
 */
export interface IExchangeAdapter {
  /** Which exchange this adapter connects to */
  readonly exchangeId: ExchangeId;

  /** Capabilities this adapter supports */
  readonly capabilities: ReadonlySet<ExchangeCapability>;

  // -- Market data (required) ------------------------------------------------

  /** Fetch OHLCV candles */
  getCandles(params: CandleParams): Promise<OHLCV[]>;

  /** Fetch current ticker */
  getTicker(symbol: string): Promise<Ticker>;

  /** Fetch current price */
  getPrice(symbol: string): Promise<Price>;

  /** Fetch orderbook snapshot */
  getOrderbook(symbol: string, depth?: number): Promise<Orderbook>;

  /** Fetch recent trades */
  getRecentTrades(symbol: string, limit?: number): Promise<Trade[]>;

  /** List available instruments */
  getInstruments(): Promise<Instrument[]>;

  // -- Derivatives market data (optional) ------------------------------------

  /** Fetch funding rate for a perpetual */
  getFundingRate?(symbol: string): Promise<FundingRate>;

  /** Fetch open interest */
  getOpenInterest?(symbol: string): Promise<OpenInterest>;

  // -- Execution (optional) --------------------------------------------------

  /** Place an order */
  placeOrder?(params: OrderParams): Promise<OrderResult>;

  /** Cancel an order */
  cancelOrder?(symbol: string, orderId: string): Promise<boolean>;

  /** Open a position with SL/TP */
  openPosition?(params: OpenPositionParams): Promise<OrderResult>;

  /** Close a position */
  closePosition?(params: ClosePositionParams): Promise<OrderResult>;

  /** Get a swap quote (DEX) */
  getSwapQuote?(params: SpotSwapParams): Promise<SwapQuote>;

  /** Execute a swap (DEX) */
  executeSwap?(params: SpotSwapParams): Promise<OrderResult>;

  // -- Account (optional) ----------------------------------------------------

  /** Fetch account balances */
  getBalances?(): Promise<Balance[]>;

  /** Fetch open positions */
  getPositions?(): Promise<Position[]>;

  /** Fetch open orders */
  getOpenOrders?(symbol?: string): Promise<Order[]>;

  // -- Trader discovery (optional) -------------------------------------------

  /** Discover top traders / leaderboard */
  getTopTraders?(limit?: number): Promise<TraderProfile[]>;
}
