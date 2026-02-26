// ---------------------------------------------------------------------------
// brain/index.ts -- Barrel export for brain layer
// ---------------------------------------------------------------------------

export { runEvaluation } from './analysis.js';
export { createBrainTools } from './tools.js';
export type { BrainDeps } from './tools.js';
export {
  formatEvaluateResult,
  formatDiscoverResult,
  formatArbitrageResult,
  formatCalibrateResult,
} from './formatter.js';
export type {
  MarketVerdict,
  EdgeType,
  EvaluateResult,
  EvaluateEvidence,
  EvaluationParams,
  DiscoverResult,
  DiscoverItem,
  ArbitrageResult,
  ArbitrageOpportunity,
  CorrelateResult,
  CorrelatedPair,
  SizeResult,
  PositionAllocation,
  CalibrateResult,
} from './types.js';
