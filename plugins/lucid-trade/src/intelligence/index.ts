// ---------------------------------------------------------------------------
// intelligence/index.ts -- Barrel export for all intelligence modules
// ---------------------------------------------------------------------------

// Technical Analysis Indicators
export {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  historicalVolatility,
} from './indicators.js';

// Trend Detection, Support/Resistance, Volatility Regime
export {
  detectTrend,
  findSupportResistance,
  classifyVolatilityRegime,
  volatilityMultiplier,
} from './trend.js';
export type {
  TrendType,
  TrendResult,
  VolatilityRegime,
  SupportResistanceResult,
} from './trend.js';

// Risk Engine — Position Sizing
export {
  fixedPercentageSize,
  kellyCriterionSize,
  calculateRiskReward,
  calculateLiquidationPrice,
} from './risk-engine.js';
export type {
  FixedPercentageParams,
  FixedPercentageResult,
  KellyParams,
  KellyResult,
  RiskRewardParams,
  RiskRewardRating,
  RiskRewardResult,
  LiquidationParams,
} from './risk-engine.js';

// Backtesting Engine
export {
  backtestSmaCrossover,
  backtestRsi,
  buildBacktestResult,
} from './backtester.js';
export type { BacktestTrade, BacktestResult } from './backtester.js';
