// ---------------------------------------------------------------------------
// brain/index.ts -- Barrel export for brain layer
// ---------------------------------------------------------------------------

export { runTriage } from './analysis.js';
export { createBrainTools } from './tools.js';
export type { BrainDeps } from './tools.js';
export {
  formatTriageResult,
  formatReadinessResult,
  formatOutboxResult,
  formatDiagnosisResult,
} from './formatter.js';
export type {
  TriageParams,
  ReadinessParams,
  OutboxParams,
  DiagnoseParams,
} from './types.js';
