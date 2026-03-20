// ---------------------------------------------------------------------------
// trading.ts -- Trading execution types for Lucid Trade
// ---------------------------------------------------------------------------

import type { ExchangeId, OrderSide, OrderType, PositionSide, AssetType } from './common.js';

/** Open position */
export interface Position {
  exchange: ExchangeId;
  symbol: string;
  side: PositionSide;
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice?: number;
  marginType?: 'cross' | 'isolated';
  timestamp: number;
}

/** Open or pending order */
export interface Order {
  exchange: ExchangeId;
  symbol: string;
  orderId: string;
  side: OrderSide;
  type: OrderType;
  price?: number;
  stopPrice?: number;
  size: number;
  filled: number;
  remaining: number;
  status: 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'expired' | 'rejected';
  timestamp: number;
}

/** Closed trade / fill */
export interface ClosedTrade {
  exchange: ExchangeId;
  symbol: string;
  side: OrderSide;
  entryPrice: number;
  exitPrice: number;
  size: number;
  realizedPnl: number;
  fees: number;
  entryTime: number;
  exitTime: number;
}

/** Account balance entry */
export interface Balance {
  exchange: ExchangeId;
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue?: number;
}

/** Parameters for opening a position */
export interface OpenPositionParams {
  exchange: ExchangeId;
  symbol: string;
  side: PositionSide;
  type: OrderType;
  size: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
  reduceOnly?: boolean;
}

/** Parameters for closing a position */
export interface ClosePositionParams {
  exchange: ExchangeId;
  symbol: string;
  side: PositionSide;
  size?: number; // undefined = close all
  type?: OrderType;
  price?: number;
}

/** Generic order placement params */
export interface OrderParams {
  exchange: ExchangeId;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  size: number;
  price?: number;
  stopPrice?: number;
  reduceOnly?: boolean;
  postOnly?: boolean;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

/** Order placement result */
export interface OrderResult {
  exchange: ExchangeId;
  orderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: 'open' | 'filled' | 'rejected';
  price?: number;
  filledSize?: number;
  timestamp: number;
}

/** Spot swap parameters */
export interface SpotSwapParams {
  exchange: ExchangeId;
  fromAsset: string;
  toAsset: string;
  amount: number;
  slippageBps?: number;
}

/** Quote for a swap */
export interface SwapQuote {
  exchange: ExchangeId;
  fromAsset: string;
  toAsset: string;
  inputAmount: number;
  outputAmount: number;
  price: number;
  priceImpactBps: number;
  route?: string[];
  expiresAt: number;
}
