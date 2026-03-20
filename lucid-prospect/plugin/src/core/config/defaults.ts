import type { PluginConfig } from '../types/index.js';

export const CONFIG_DEFAULTS: Partial<PluginConfig> = {
  tenantId: 'default',
  defaultScoreThreshold: 50,
  enrichSchedule: '0 2 * * *',
};
