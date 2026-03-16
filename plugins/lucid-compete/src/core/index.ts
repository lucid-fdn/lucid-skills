// Types
export * from './types/index.js';

// Config
export { loadConfig, getConfig, resetConfig, CONFIG_DEFAULTS, PluginConfigSchema } from './config/index.js';

// Plugin identity
export { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION } from './plugin-id.js';

// Database
export * from './db/index.js';

// Fetchers
export { createFetcherRegistry } from './fetchers/index.js';
export { BaseFetcher } from './fetchers/base.js';

// Analysis
export { classifySignal, buildBattlecardPrompt, buildBriefPrompt, BATTLECARD_SYSTEM_PROMPT, BRIEF_SYSTEM_PROMPT } from './analysis/index.js';

// Alerts
export { createNotifierRegistry } from './alerts/index.js';
export { BaseNotifier } from './alerts/base.js';

// Tools
export { createAllTools } from './tools/index.js';
export type { ToolDefinition, ToolParamDef, ToolDependencies } from './tools/index.js';

// Services
export { startScheduler, stopScheduler } from './services/index.js';

// Utils
export * from './utils/index.js';
