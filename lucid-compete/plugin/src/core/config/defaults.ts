// ---------------------------------------------------------------------------
// defaults.ts -- Default configuration values
// ---------------------------------------------------------------------------

export const CONFIG_DEFAULTS = {
  tenantId: 'default',
  fetchSchedule: '0 */6 * * *',
  briefSchedule: '0 9 * * 1',
  alertSeverity: 'high' as const,
};
