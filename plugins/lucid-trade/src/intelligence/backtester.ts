// ---------------------------------------------------------------------------
// intelligence/backtester.ts -- Backtesting engine
// ---------------------------------------------------------------------------
// Strategies & metrics sourced from:
//   skills/backtesting/references/strategies.md
//   skills/portfolio/references/performance-metrics.md
// ---------------------------------------------------------------------------

import { sma } from './indicators.js';
import { rsi as computeRsi } from './indicators.js';
import type { OHLCV } from '../types/index.js';

// ---- Types -----------------------------------------------------------------

export interface BacktestTrade {
  entryPrice: number;
  exitPrice: number;
  side: 'buy';
  pnl: number;
  pnlPct: number;
  entryTime: number;
  exitTime: number;
}

export interface BacktestResult {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  trades: BacktestTrade[];
}

// ---- backtestSmaCrossover --------------------------------------------------

/**
 * SMA Crossover backtest.
 *
 * BUY on golden cross (fast crosses above slow).
 * SELL on death cross (fast crosses below slow).
 * Long only.
 */
export function backtestSmaCrossover(
  bars: OHLCV[],
  fastPeriod = 10,
  slowPeriod = 30,
): BacktestResult {
  const closes = bars.map((b) => b.close);
  const fastSma = sma(closes, fastPeriod);
  const slowSma = sma(closes, slowPeriod);

  if (slowSma.length < 2) {
    return buildBacktestResult([]);
  }

  // Align arrays: slow SMA has fewer values than fast SMA
  const offset = slowPeriod - fastPeriod;

  const trades: BacktestTrade[] = [];
  let position: { entryPrice: number; entryTime: number } | null = null;

  for (let i = 1; i < slowSma.length; i++) {
    const prevFast = fastSma[i - 1 + offset]!;
    const prevSlow = slowSma[i - 1]!;
    const currFast = fastSma[i + offset]!;
    const currSlow = slowSma[i]!;
    const barIndex = i + slowPeriod - 1;
    const bar = bars[barIndex]!;

    // Golden Cross: fast crosses above slow -> BUY
    if (prevFast <= prevSlow && currFast > currSlow && position === null) {
      position = { entryPrice: bar.close, entryTime: bar.timestamp };
    }

    // Death Cross: fast crosses below slow -> SELL
    if (prevFast >= prevSlow && currFast < currSlow && position !== null) {
      const pnl = bar.close - position.entryPrice;
      const pnlPct = (pnl / position.entryPrice) * 100;
      trades.push({
        entryPrice: position.entryPrice,
        exitPrice: bar.close,
        side: 'buy',
        pnl,
        pnlPct,
        entryTime: position.entryTime,
        exitTime: bar.timestamp,
      });
      position = null;
    }
  }

  return buildBacktestResult(trades);
}

// ---- backtestRsi -----------------------------------------------------------

/**
 * RSI Mean-Reversion backtest.
 *
 * BUY when RSI crosses above oversold.
 * SELL when RSI crosses above overbought.
 * Long only.
 */
export function backtestRsi(
  bars: OHLCV[],
  period = 14,
  oversold = 30,
  overbought = 70,
): BacktestResult {
  const closes = bars.map((b) => b.close);
  const rsiValues = computeRsi(closes, period);

  if (rsiValues.length < 2) {
    return buildBacktestResult([]);
  }

  const trades: BacktestTrade[] = [];
  let position: { entryPrice: number; entryTime: number } | null = null;

  for (let i = 1; i < rsiValues.length; i++) {
    const barIndex = i + period;
    const bar = bars[barIndex]!;
    const prevRsi = rsiValues[i - 1]!;
    const currRsi = rsiValues[i]!;

    // RSI crosses above oversold -> BUY (mean reversion entry)
    if (prevRsi <= oversold && currRsi > oversold && position === null) {
      position = { entryPrice: bar.close, entryTime: bar.timestamp };
    }

    // RSI crosses above overbought -> SELL (take profit)
    if (prevRsi <= overbought && currRsi > overbought && position !== null) {
      const pnl = bar.close - position.entryPrice;
      const pnlPct = (pnl / position.entryPrice) * 100;
      trades.push({
        entryPrice: position.entryPrice,
        exitPrice: bar.close,
        side: 'buy',
        pnl,
        pnlPct,
        entryTime: position.entryTime,
        exitTime: bar.timestamp,
      });
      position = null;
    }
  }

  return buildBacktestResult(trades);
}

// ---- buildBacktestResult ---------------------------------------------------

/**
 * Compute backtest performance metrics from a list of trades.
 *
 * - Equity curve: equity * (1 + pnlPct/100) per trade
 * - Max drawdown: peak-to-trough
 * - Sharpe: annualized (365 days)
 * - Win rate, profit factor, total trades
 */
export function buildBacktestResult(
  trades: BacktestTrade[],
  startingEquity = 10000,
): BacktestResult {
  if (trades.length === 0) {
    return {
      totalReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0,
      profitFactor: 0,
      trades: [],
    };
  }

  // Build equity curve
  let equity = startingEquity;
  const equitySeries: number[] = [equity];
  const dailyReturns: number[] = [];

  for (const trade of trades) {
    dailyReturns.push(trade.pnlPct / 100);
    equity = equity * (1 + trade.pnlPct / 100);
    equitySeries.push(equity);
  }

  const totalReturn =
    ((equity - startingEquity) / startingEquity) * 100;

  // Max Drawdown
  let peak = equitySeries[0]!;
  let maxDD = 0;
  for (const value of equitySeries) {
    if (value > peak) peak = value;
    const dd = (peak - value) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  const maxDrawdown = maxDD * 100;

  // Sharpe Ratio
  let sharpeRatio = 0;
  if (dailyReturns.length >= 2) {
    const mean =
      dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    let variance = 0;
    for (const r of dailyReturns) {
      const diff = r - mean;
      variance += diff * diff;
    }
    variance /= dailyReturns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 0) {
      sharpeRatio = (mean * 365) / (stdDev * Math.sqrt(365));
    }
  }

  // Win Rate
  const winners = trades.filter((t) => t.pnl > 0).length;
  const winRate = (winners / trades.length) * 100;

  // Profit Factor
  let grossProfit = 0;
  let grossLoss = 0;
  for (const trade of trades) {
    if (trade.pnl > 0) grossProfit += trade.pnl;
    else if (trade.pnl < 0) grossLoss += Math.abs(trade.pnl);
  }
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  return {
    totalReturn,
    sharpeRatio,
    maxDrawdown,
    winRate,
    totalTrades: trades.length,
    profitFactor,
    trades,
  };
}
