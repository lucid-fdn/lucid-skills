// Types
export * from './types/index.js';

// Config
export { loadConfig, getConfig, resetConfig, CONFIG_DEFAULTS, CONFIG_SCHEMA } from './config/index.js';

// Plugin identity
export { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_DESCRIPTION } from './plugin-id.js';

// Database
export * from './db/index.js';

// Providers
export { createProviderRegistry } from './providers/index.js';

// Analysis
export {
  fullVulnerabilityScan,
  detectReentrancy,
  detectAccessControl,
  fullGasAnalysis,
  computeSecurityScore,
  scoreToGrade,
  buildScoreBreakdown,
  AUDIT_REPORT_SYSTEM_PROMPT,
  buildAuditReportPrompt,
} from './analysis/index.js';

// Tools
export { createAllTools } from './tools/index.js';
export type { ToolDefinition, ToolParamDef } from './tools/types.js';
export type { ToolDependencies } from './tools/index.js';

// Services
export { startScheduler, stopScheduler } from './services/index.js';

// Utils
export * from './utils/index.js';
