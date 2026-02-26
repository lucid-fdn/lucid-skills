// ---------------------------------------------------------------------------
// brain/types.ts -- Brain result types for Lucid Predict
// ---------------------------------------------------------------------------

import type { Market, PlatformId } from '../types/index.js';
import type { Adjustment } from '../math/bayesian.js';
import type { EvResult } from '../math/ev.js';
import type { KellyResult } from '../math/kelly.js';
import type { EfficiencyResult } from '../math/efficiency.js';
import type { LiquidityResult } from '../math/liquidity.js';

// ---------------------------------------------------------------------------
// Verdicts & Edge Types
// ---------------------------------------------------------------------------

export type MarketVerdict = 'BUY_YES' | 'BUY_NO' | 'SKIP' | 'HEDGE';

export type EdgeType =
  | 'base_rate_deviation'
  | 'time_decay'
  | 'liquidity_premium'
  | 'cross_platform_arb'
  | 'correlation_lag'
  | 'information_asymmetry'
  | 'none';

// ---------------------------------------------------------------------------
// EvaluateResult — the core output (equivalent to trade's ThinkResult)
// ---------------------------------------------------------------------------

export interface EvaluateEvidence {
  baseRate: number;
  adjustments: Adjustment[];
  estimatedProbability: number;
  marketPrice: number;
  ev: EvResult;
  kelly: KellyResult;
  efficiency: EfficiencyResult;
  liquidity: LiquidityResult;
  daysToClose: number;
  timeDecayScore: number;
  isNearCertainExpiry: boolean;
}

export interface EvaluateResult {
  schemaVersion: '1.0';
  market: {
    platform: PlatformId;
    externalId: string;
    title: string;
    url: string;
  };
  verdict: MarketVerdict;
  score: number; // 0-100
  calibration: { isProbability: true };
  edge: {
    type: EdgeType;
    pct: number;
    description: string;
  };
  evidence: EvaluateEvidence;
  sizing: {
    recommended: number;
    positionSize: number;
    fullKelly: number;
    halfKelly: number;
  };
  risks: string[];
  invalidation: string;
  provenance: {
    platform: PlatformId;
    evaluatedAt: string;
    rulesetVersion: string;
  };
}

// ---------------------------------------------------------------------------
// Other brain result types
// ---------------------------------------------------------------------------

export interface DiscoverItem {
  market: Market;
  edgePct: number;
  edgeType: EdgeType;
  score: number;
  verdict: MarketVerdict;
}

export interface DiscoverResult {
  items: DiscoverItem[];
  scannedCount: number;
  platformsSearched: PlatformId[];
}

export interface ArbitrageOpportunity {
  marketA: Market;
  marketB: Market;
  similarity: number;
  yesPrice: number;
  noPrice: number;
  combinedCost: number;
  profit: number;
  profitPct: number;
}

export interface ArbitrageResult {
  opportunities: ArbitrageOpportunity[];
  pairsScanned: number;
  platformsSearched: PlatformId[];
}

export interface CorrelatedPair {
  resolved: Market;
  unresolved: Market;
  similarity: number;
  resolvedOutcome: string;
  unresolvedPrice: number;
  impliedMispricing: number;
}

export interface CorrelateResult {
  pairs: CorrelatedPair[];
  marketsScanned: number;
}

export interface PositionAllocation {
  market: { title: string; platform: PlatformId };
  recommendedFraction: number;
  positionSize: number;
  edgePct: number;
}

export interface SizeResult {
  allocations: PositionAllocation[];
  totalAllocated: number;
  bankroll: number;
  remainingBankroll: number;
}

export interface CalibrateResult {
  brierScore: number;
  overconfidenceScore: number;
  buckets: Array<{
    range: string;
    predicted: number;
    actual: number;
    count: number;
    deviation: number;
  }>;
  totalForecasts: number;
  rating: 'excellent' | 'good' | 'fair' | 'poor';
}

// ---------------------------------------------------------------------------
// Analysis params
// ---------------------------------------------------------------------------

export interface EvaluationParams {
  market: Market;
  estimatedProbability?: number;
  bankroll: number;
  maxFraction?: number;
  adjustments?: Adjustment[];
}
