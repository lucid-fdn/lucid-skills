// ---------------------------------------------------------------------------
// audit-scheduler.ts -- Placeholder scheduler for periodic audits
// ---------------------------------------------------------------------------

import type { PluginConfig } from '../types/index.js';
import { log } from '../utils/logger.js';

let schedulerRunning = false;

interface SchedulerDeps {
  config: PluginConfig;
}

export function startScheduler(deps: SchedulerDeps): void {
  if (schedulerRunning) {
    log.warn('Audit scheduler already running');
    return;
  }
  schedulerRunning = true;
  log.info(`Audit scheduler started (schedule: ${deps.config.scanSchedule})`);
}

export function stopScheduler(): void {
  if (schedulerRunning) {
    schedulerRunning = false;
    log.info('Audit scheduler stopped');
  }
}
