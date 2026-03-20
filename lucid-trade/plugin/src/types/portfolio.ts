// ---------------------------------------------------------------------------
// portfolio.ts -- Portfolio and performance types for Lucid Trade
// ---------------------------------------------------------------------------

import type { ExchangeId } from './common.js';

/** Risk level classification */
export type RiskLevel = 'conservative' | 'moderate' | 'aggressive' | 'degen';

/** Allocation entry */
export interface AllocationEntry {
  asset: string;
  exchange: ExchangeId;
  value: number;
  percentage: number;
  type: 'spot' | 'perpetual' | 'staked' | 'lending';
}

/** Performance metrics for a period */
export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  averageWin: number;
  averageLoss: number;
  bestTrade: number;
  worstTrade: number;
  averageHoldingPeriod: number;
  periodStart: number;
  periodEnd: number;
}

/** Full portfolio overview */
export interface PortfolioOverview {
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  allocations: AllocationEntry[];
  riskLevel: RiskLevel;
  exchanges: ExchangeId[];
  lastUpdated: number;
}

/** Trader profile for social / copy-trading discovery */
export interface TraderProfile {
  exchange: ExchangeId;
  traderId: string;
  username?: string;
  pnl30d: number;
  pnl30dPct: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  sharpRatio: number;
  followers?: number;
  aum?: number;
  lastActive: number;
}
