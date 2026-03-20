import type { PluginConfig } from '../types/config.js';
import { logger } from '../utils/logger.js';

export interface SchedulerHandle {
  stop(): void;
}

/**
 * Start the tax scheduler for background jobs:
 *   - Daily: update historical prices
 *   - Weekly: sync transactions from imported wallets
 */
export function startScheduler(config: PluginConfig): SchedulerHandle {
  const DAILY_MS = 24 * 60 * 60 * 1000;
  const WEEKLY_MS = 7 * DAILY_MS;

  const dailyTimer = setInterval(() => {
    logger.info('Scheduler: running daily price update');
    // In production, this would fetch and cache prices for all tracked tokens
  }, DAILY_MS);

  const weeklyTimer = setInterval(() => {
    logger.info('Scheduler: running weekly transaction sync');
    // In production, this would re-fetch transactions for all imported wallets
  }, WEEKLY_MS);

  logger.info('Tax scheduler started (daily price updates, weekly tx sync)');

  return {
    stop() {
      clearInterval(dailyTimer);
      clearInterval(weeklyTimer);
      logger.info('Tax scheduler stopped');
    },
  };
}
