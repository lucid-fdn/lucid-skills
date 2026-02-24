// ---------------------------------------------------------------------------
// defaults.ts -- Default config values
// ---------------------------------------------------------------------------

import type { PluginConfig } from '../types/index.js';

export const CONFIG_DEFAULTS: Omit<PluginConfig, 'supabaseUrl' | 'supabaseKey'> = {
  tenantId: 'default',
  maxContractSize: 50000,
  scanSchedule: '0 */6 * * *',
};
