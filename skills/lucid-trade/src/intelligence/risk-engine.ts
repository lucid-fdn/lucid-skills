// ---------------------------------------------------------------------------
// intelligence/risk-engine.ts -- Risk management & position sizing
// ---------------------------------------------------------------------------
// Formulas sourced from skills/trading/references/risk-parameters.md
// ---------------------------------------------------------------------------

// ---- Types -----------------------------------------------------------------

export interface FixedPercentageParams {
  portfolioValue: number;
  riskPct: number;
  entryPrice: number;
  stopLossPrice: number;
  maxPositionPct: number;
}

export interface FixedPercentageResult {
  riskAmount: number;
  stopLossDistance: number;
  positionSize: number;
  positionValue: number;
  capped: boolean;
}

export interface KellyParams {
  portfolioValue: number;
  winRate?: number;
  avgWinPct?: number;
  avgLossPct?: number;
}

export interface KellyResult {
  kellyFraction: number;
  halfKellyFraction: number;
  positionValue: number;
}

export interface RiskRewardParams {
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
}

export type RiskRewardRating = 'excellent' | 'good' | 'acceptable' | 'poor';

export interface RiskRewardResult {
  risk: number;
  reward: number;
  ratio: number;
  rating: RiskRewardRating;
}

export interface LiquidationParams {
  entryPrice: number;
  leverage: number;
  side: 'long' | 'short';
  maintenanceMarginPct?: number;
}

// ---- fixedPercentageSize ---------------------------------------------------

/**
 * Fixed-Percentage Risk Model.
 *
 * Risk Amount = Portfolio * (RiskPct / 100)
 * Position Size = Risk Amount / |Entry - StopLoss|
 * Caps at maxPositionPct of portfolio.
 */
export function fixedPercentageSize(
  params: FixedPercentageParams,
): FixedPercentageResult {
  const { portfolioValue, riskPct, entryPrice, stopLossPrice, maxPositionPct } =
    params;

  const riskAmount = portfolioValue * (riskPct / 100);
  const stopLossDistance = Math.abs(entryPrice - stopLossPrice);

  if (stopLossDistance === 0) {
    return {
      riskAmount,
      stopLossDistance: 0,
      positionSize: 0,
      positionValue: 0,
      capped: false,
    };
  }

  let positionSize = riskAmount / stopLossDistance;
  let positionValue = positionSize * entryPrice;
  const maxAllowed = portfolioValue * (maxPositionPct / 100);
  let capped = false;

  if (positionValue > maxAllowed) {
    positionValue = maxAllowed;
    positionSize = maxAllowed / entryPrice;
    capped = true;
  }

  return { riskAmount, stopLossDistance, positionSize, positionValue, capped };
}

// ---- kellyCriterionSize ----------------------------------------------------

/**
 * Kelly Criterion (Half-Kelly) position sizing.
 *
 * kelly = (WinRate * AvgWin% - (1-WinRate) * AvgLoss%) / AvgWin%
 * halfKelly = max(0, kelly / 2)
 * Position Value = Portfolio * halfKelly
 *
 * Defaults: WinRate=0.55, AvgWin=3.0%, AvgLoss=2.0%
 */
export function kellyCriterionSize(params: KellyParams): KellyResult {
  const {
    portfolioValue,
    winRate = 0.55,
    avgWinPct = 3.0,
    avgLossPct = 2.0,
  } = params;

  const kellyFraction =
    (winRate * avgWinPct - (1 - winRate) * avgLossPct) / avgWinPct;
  const halfKellyFraction = Math.max(0, kellyFraction / 2);
  const positionValue = portfolioValue * halfKellyFraction;

  return { kellyFraction, halfKellyFraction, positionValue };
}

// ---- calculateRiskReward ---------------------------------------------------

/**
 * Risk/Reward ratio with quality rating.
 *
 * Risk = |Entry - StopLoss|
 * Reward = |TakeProfit - Entry|
 * R:R = Reward / Risk
 *
 * >= 3:1 excellent, >= 2:1 good, >= 1:1 acceptable, < 1:1 poor
 */
export function calculateRiskReward(
  params: RiskRewardParams,
): RiskRewardResult {
  const { entryPrice, stopLossPrice, takeProfitPrice } = params;

  const risk = Math.abs(entryPrice - stopLossPrice);
  const reward = Math.abs(takeProfitPrice - entryPrice);

  if (risk === 0) {
    return { risk, reward, ratio: 0, rating: 'poor' };
  }

  const ratio = reward / risk;

  let rating: RiskRewardRating;
  if (ratio >= 3) {
    rating = 'excellent';
  } else if (ratio >= 2) {
    rating = 'good';
  } else if (ratio >= 1) {
    rating = 'acceptable';
  } else {
    rating = 'poor';
  }

  return { risk, reward, ratio, rating };
}

// ---- calculateLiquidationPrice ---------------------------------------------

/**
 * Liquidation price for leveraged positions.
 *
 * LONG:  entry * (1 - 1/leverage + maintenanceMargin%)
 * SHORT: entry * (1 + 1/leverage - maintenanceMargin%)
 *
 * Default maintenance margin: 0.5% (0.005)
 */
export function calculateLiquidationPrice(params: LiquidationParams): number {
  const {
    entryPrice,
    leverage,
    side,
    maintenanceMarginPct = 0.5,
  } = params;

  const maintenanceFraction = maintenanceMarginPct / 100;

  if (side === 'long') {
    return entryPrice * (1 - 1 / leverage + maintenanceFraction);
  }

  // short
  return entryPrice * (1 + 1 / leverage - maintenanceFraction);
}
