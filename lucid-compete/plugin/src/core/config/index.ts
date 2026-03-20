// ---------------------------------------------------------------------------
// index.ts -- Barrel re-export for config module
// ---------------------------------------------------------------------------

export { PluginConfigSchema } from './schema.js';
export type { PluginConfigFromSchema } from './schema.js';
export { CONFIG_DEFAULTS } from './defaults.js';
export { loadConfig, getConfig, resetConfig } from './loader.js';
