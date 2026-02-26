// ---------------------------------------------------------------------------
// brain/index.ts -- Barrel export for brain layer
// ---------------------------------------------------------------------------

export { runAudit, runCompare, runBatchScan, runGasAnalysis } from './analysis.js';
export { createBrainTools } from './tools.js';
export type { BrainDeps } from './tools.js';
export {
  formatAuditResult,
  formatCompareResult,
  formatBatchResult,
  formatGasResult,
} from './formatter.js';
export type {
  AuditVerdict,
  AuditResult,
  CompareResult,
  BatchScanResult,
  GasResult,
} from './types.js';
