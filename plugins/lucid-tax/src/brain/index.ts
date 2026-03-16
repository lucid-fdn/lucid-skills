// ---------------------------------------------------------------------------
// brain/index.ts -- Barrel export for brain layer
// ---------------------------------------------------------------------------

export { createBrainTools } from './tools.js';
export type { BrainDeps } from './tools.js';
export {
  runTaxAnalysis,
  runMethodComparison,
  runHarvestingAnalysis,
  runWalletHealth,
} from './analysis.js';
export type {
  TaxAnalysisParams,
  MethodComparisonParams,
  HarvestingAnalysisParams,
  WalletHealthParams,
} from './analysis.js';
export {
  formatTaxAnalysis,
  formatMethodComparison,
  formatHarvestingResult,
  formatWalletHealth,
} from './formatter.js';
export type {
  TaxVerdict,
  TaxAnalysisResult,
  MethodComparisonResult,
  HarvestingResult,
  WalletHealthResult,
} from './types.js';
