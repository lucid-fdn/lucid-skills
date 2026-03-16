// ---------------------------------------------------------------------------
// brain/types.ts -- Brain tool type definitions for Lucid Quantum
// ---------------------------------------------------------------------------

/** Verdict for fleet optimization decisions */
export type FleetVerdict = 'OPTIMIZE' | 'HOLD' | 'REBALANCE' | 'ALERT';

/** Risk level for fleet health */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Fleet status assessment */
export interface FleetStatus {
  schemaVersion: '1.0';
  verdict: FleetVerdict;
  activeWorkers: number;
  totalKeysPerSecond: number;
  offlineWorkers: string[];
  modesNeedingAttention: ModeAttention[];
  recommendations: string[];
}

export interface ModeAttention {
  mode: number;
  modeName: string;
  reason: string;
  currentWeight: number;
  suggestedWeight: number;
}

/** Target analysis result from triage */
export interface TriageResult {
  schemaVersion: '1.0';
  targetsAnalyzed: number;
  topTargets: TargetInsight[];
  modeDistribution: ModeDistribution[];
  narrowingOpportunities: NarrowingOpportunity[];
}

export interface TargetInsight {
  address: string;
  topMode: string;
  topProbability: number;
  balanceBtc: number | null;
  narrowingPossible: boolean;
}

export interface ModeDistribution {
  mode: number;
  modeName: string;
  avgProbability: number;
  targetCount: number;
}

export interface NarrowingOpportunity {
  address: string;
  mode: number;
  modeName: string;
  originalKeyspace: number;
  narrowedKeyspace: number;
  reductionPercent: number;
}

/** Fingerprint analysis result */
export interface FingerprintInsight {
  schemaVersion: '1.0';
  hash160Hex: string;
  walletSoftware: string | null;
  confidence: number;
  probableModes: { mode: number; probability: number }[];
  recommendation: string;
}

/** Optimization result */
export interface OptimizeInsight {
  schemaVersion: '1.0';
  targetsAnalyzed: number;
  fingerprintsUsed: number;
  modesUpdated: number;
  beforeWeights: Record<string, number>;
  afterWeights: Record<string, number>;
  estimatedSpeedupFactor: number;
}

/** Brain wallet strategy evaluation */
export interface StrategyInsight {
  schemaVersion: '1.0';
  strategies: StrategyPerformance[];
  bestStrategy: string;
  recommendations: string[];
}

export interface StrategyPerformance {
  strategyTag: string;
  totalCandidates: number;
  totalHits: number;
  hitRate: number;
  trend: 'improving' | 'stable' | 'declining';
}

/** Cost analysis insight */
export interface CostInsight {
  schemaVersion: '1.0';
  totalGpuSeconds: number;
  totalKeysChecked: number;
  mostEfficient: { mode: number; modeName: string; costPerBillion: number }[];
  leastEfficient: { mode: number; modeName: string; costPerBillion: number }[];
  recommendations: string[];
}

/** Fleet health check */
export interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'danger';
  detail: string;
}

export interface ProtectResult {
  overallRisk: RiskLevel;
  checks: HealthCheck[];
}

/** Monitoring review */
export interface ReviewResult {
  period: string;
  keysCheckedInPeriod: number;
  modesCompleted: number;
  matchesFound: number;
  avgWorkerUptime: number;
  topContributor: string;
  suggestion: string;
}

/** Context passed to domain adapter methods */
export interface BrainContext {
  userId: string;
  preferences: string[];
  apiUrl: string;
}
