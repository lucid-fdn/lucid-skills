import type { CostBasisLot, Transaction } from '../types/database.js';

export interface HoldingPosition {
  tokenSymbol: string;
  totalAmount: number;
  avgCostPerUnit: number;
  totalCostBasis: number;
}

export interface HarvestOpportunity {
  tokenSymbol: string;
  amount: number;
  costBasis: number;
  currentValue: number;
  unrealizedLoss: number;
  lossPercentage: number;
  washSaleRisk: boolean;
}

/**
 * Build holding positions from unconsumed cost basis lots.
 */
export function buildPositions(lots: CostBasisLot[]): HoldingPosition[] {
  const map = new Map<string, { totalAmount: number; totalCost: number }>();

  for (const lot of lots) {
    if (lot.remaining_amount <= 0) continue;
    const key = lot.token_symbol;
    const current = map.get(key) ?? { totalAmount: 0, totalCost: 0 };
    current.totalAmount += lot.remaining_amount;
    current.totalCost += lot.remaining_amount * lot.cost_per_unit_usd;
    map.set(key, current);
  }

  const positions: HoldingPosition[] = [];
  for (const [tokenSymbol, data] of map) {
    positions.push({
      tokenSymbol,
      totalAmount: data.totalAmount,
      avgCostPerUnit: data.totalAmount > 0 ? data.totalCost / data.totalAmount : 0,
      totalCostBasis: data.totalCost,
    });
  }

  return positions;
}

/**
 * Find tax-loss harvesting opportunities from current holdings.
 */
export function findHarvestingOpportunities(
  holdings: HoldingPosition[],
  currentPrices: Record<string, number>,
  minLossUsd = 0,
): HarvestOpportunity[] {
  const opportunities: HarvestOpportunity[] = [];

  for (const h of holdings) {
    const price = currentPrices[h.tokenSymbol];
    if (price === undefined) continue;

    const currentValue = h.totalAmount * price;
    const unrealizedLoss = currentValue - h.totalCostBasis;

    if (unrealizedLoss >= 0) continue; // Not a loss
    if (Math.abs(unrealizedLoss) < minLossUsd) continue; // Below threshold

    const lossPercentage = h.totalCostBasis > 0
      ? (unrealizedLoss / h.totalCostBasis) * 100
      : 0;

    opportunities.push({
      tokenSymbol: h.tokenSymbol,
      amount: h.totalAmount,
      costBasis: h.totalCostBasis,
      currentValue,
      unrealizedLoss,
      lossPercentage,
      washSaleRisk: false, // Will be set by wash sale check
    });
  }

  // Sort by largest loss first
  return opportunities.sort((a, b) => a.unrealizedLoss - b.unrealizedLoss);
}

/**
 * Check if selling a token would trigger wash sale rules.
 * Under US IRS rules, a wash sale occurs if you sell at a loss and
 * re-purchase the same or "substantially identical" asset within 30 days
 * before or after the sale.
 */
export function calculateWashSaleRisk(
  recentTrades: Transaction[],
  token: string,
  saleDate: Date = new Date(),
): boolean {
  const WASH_SALE_WINDOW_DAYS = 30;
  const saleDateMs = saleDate.getTime();

  for (const trade of recentTrades) {
    if (trade.token_symbol !== token) continue;

    // Only look at buys/swaps that brought in this token
    if (trade.tx_type !== 'buy' && trade.tx_type !== 'swap' && trade.tx_type !== 'transfer_in') {
      continue;
    }

    const tradeDate = new Date(trade.timestamp).getTime();
    const daysDiff = Math.abs(saleDateMs - tradeDate) / (1000 * 60 * 60 * 24);

    if (daysDiff <= WASH_SALE_WINDOW_DAYS) {
      return true;
    }
  }

  return false;
}

/**
 * Estimate potential tax savings from harvesting opportunities.
 */
export function estimateTaxSavings(
  opportunities: HarvestOpportunity[],
  taxRate: number,
): number {
  const totalLoss = opportunities.reduce((sum, o) => sum + Math.abs(o.unrealizedLoss), 0);
  return totalLoss * taxRate;
}
