// ---------------------------------------------------------------------------
// brain/index.ts -- Barrel export for brain layer
// ---------------------------------------------------------------------------
export { createBrainTools } from './tools.js';
export type { BrainDeps } from './tools.js';
export {
  formatFleetStatus,
  formatTriageResult,
  formatFingerprintInsight,
  formatOptimizeInsight,
  formatStrategyInsight,
  formatCostInsight,
  formatProtectResult,
  formatReviewResult,
} from './formatter.js';
export type {
  FleetStatus,
  FleetVerdict,
  RiskLevel,
  ModeAttention,
  TriageResult,
  TargetInsight,
  ModeDistribution,
  NarrowingOpportunity,
  FingerprintInsight,
  OptimizeInsight,
  StrategyInsight,
  StrategyPerformance,
  CostInsight,
  ProtectResult,
  HealthCheck,
  ReviewResult,
  BrainContext,
} from './types.js';
