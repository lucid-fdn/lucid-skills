// ---------------------------------------------------------------------------
// math/index.ts -- Barrel export for all math functions
// ---------------------------------------------------------------------------

export { expectedValue } from './ev.js';
export type { EvResult } from './ev.js';
export { kellyFraction } from './kelly.js';
export type { KellyResult } from './kelly.js';
export { convertOdds, impliedProbability } from './odds.js';
export { analyzeEfficiency } from './efficiency.js';
export type { EfficiencyResult } from './efficiency.js';
export { liquidityScore } from './liquidity.js';
export type { LiquidityResult } from './liquidity.js';
export { daysToClose, timeDecayScore, isNearCertainExpiry } from './time-value.js';
export { estimateProbability, bayesianUpdate } from './bayesian.js';
export type { Adjustment } from './bayesian.js';
export { brierScore, calibrationBuckets, overconfidenceScore } from './brier.js';
export type { CalibrationBucket } from './brier.js';
export { titleSimilarity, matchMarkets, calculateSpread, calculateArbitrage } from './correlation.js';
