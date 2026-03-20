// ---------------------------------------------------------------------------
// types/index.ts -- Core type definitions for Lucid Quantum
// ---------------------------------------------------------------------------

/** GPU worker status */
export type WorkerStatus = 'online' | 'offline';

/** Work unit status */
export type WorkUnitStatus = 'assigned' | 'completed' | 'expired' | 'failed';

/** Target address search status */
export type TargetStatus = 'searching' | 'found' | 'verified';

/** Brain wallet batch status */
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Wallet fingerprint identification */
export type WalletSoftware =
  | 'bitcoin-qt-0.1-0.3'
  | 'bitcoin-qt-0.3-0.7'
  | 'bitcoin-qt-0.8+'
  | 'electrum-1.x'
  | 'blockchain.info-2011-2013'
  | 'android-bitcoinj';

/** Key generation mode (0-22) */
export interface ModeInfo {
  mode: number;
  modeName: string;
  totalKeyspace: number;
  keysCompleted: number;
  percentComplete: number;
  isExhausted: boolean;
  priorityWeight: number;
}

/** Worker detail */
export interface WorkerInfo {
  id: string;
  name: string;
  status: WorkerStatus;
  gpuModel: string;
  keysPerSecond: number;
  lastHeartbeat: string;
}

/** Target with triage data */
export interface TriagedTarget {
  hash160Hex: string;
  address: string;
  balanceBtc: number | null;
  firstSeenTimestamp: number | null;
  txCount: number | null;
  scriptType: string | null;
  isCoinbase: boolean;
  modeScores: ModeScore[];
  topMode: ModeScore | null;
  narrowedRanges: Record<string, [number, number]> | null;
  clusterId: string | null;
}

/** Per-mode vulnerability score */
export interface ModeScore {
  mode: number;
  modeName: string;
  probability: number;
}

/** Wallet fingerprint result */
export interface FingerprintResult {
  hash160Hex: string;
  walletSoftware: WalletSoftware | null;
  confidence: number;
  probableModes: ProbableMode[];
  nlocktimePattern: string | null;
  txVersion: number | null;
  outputOrdering: string | null;
  sequencePattern: string | null;
  feeRateAvg: number | null;
}

/** Mode-probability pair from fingerprinting */
export interface ProbableMode {
  mode: number;
  probability: number;
}

/** Narrowed search range for a mode */
export interface NarrowedRange {
  mode: number;
  modeName: string;
  startOffset: number;
  endOffset: number;
  keyspaceReduction: string;
}

/** Cost efficiency per mode */
export interface CostEntry {
  mode: number;
  modeName: string;
  totalKeyspace: number;
  keysCompleted: number;
  percentComplete: number;
  gpuSecondsSpent: number;
  costPerBillionKeys: number;
  estimatedRemainingSeconds: number;
  priorityWeight: number;
}

/** Auto-optimize result */
export interface OptimizeResult {
  targetsAnalyzed: number;
  fingerprintsUsed: number;
  modesUpdated: number;
  weights: Record<number, number>;
}

/** Brain wallet batch */
export interface BrainBatch {
  id: string;
  strategyTag: string;
  candidateCount: number;
  checkedCount: number;
  hits: number;
  hitRate: number;
  status: BatchStatus;
}

/** Global platform statistics */
export interface GlobalStats {
  totalKeysChecked: number;
  gpuHoursTotal: number;
  activeWorkers: number;
  keysPerSecond: number;
  totalUsers: number;
}
