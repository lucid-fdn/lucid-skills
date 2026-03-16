// Public API
export { createTaxServer } from './adapters/mcp.js';
export { createOpenClawManifest } from './adapters/openclaw.js';
export { createTools } from './core/tools/index.js';
export { loadConfig } from './core/config/loader.js';
export { PLUGIN_ID, PLUGIN_NAME } from './core/plugin-id.js';

// Types
export type { PluginConfig } from './core/types/config.js';
export type {
  Chain,
  TxType,
  CostBasisMethod,
  TaxJurisdiction,
  GainType,
  ReportFormat,
  IncomeType,
} from './core/types/common.js';
export type {
  TaxWallet,
  Transaction,
  CostBasisLot,
  TaxEvent,
  TaxSummary,
  PriceHistory,
} from './core/types/database.js';
export type { ToolDefinition, ToolResult } from './core/tools/types.js';
