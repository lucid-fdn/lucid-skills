import { Cron } from 'croner';
import type { PluginConfig, Fetcher, MonitorType, Notifier, NotifierType } from '../types/index.js';
import { log } from '../utils/logger.js';

interface SchedulerDeps {
  config: PluginConfig;
  fetcherRegistry: Map<MonitorType, Fetcher>;
  notifierRegistry: Map<NotifierType, Notifier>;
}

let fetchJob: Cron | null = null;
let briefJob: Cron | null = null;

export function startScheduler(deps: SchedulerDeps): void {
  const { config } = deps;

  // Fetch job — default every 6 hours
  fetchJob = new Cron(config.fetchSchedule, async () => {
    log.info('Scheduled fetch starting...');
    try {
      // Import dynamically to avoid circular deps
      const { createFetchNowTool } = await import('../tools/fetch-now.js');
      const tool = createFetchNowTool(deps);
      const result = await tool.execute({});
      log.info('Scheduled fetch complete:', result);
    } catch (err) {
      log.error('Scheduled fetch failed:', err instanceof Error ? err.message : String(err));
    }
  });
  log.info(`Fetch scheduler started: ${config.fetchSchedule}`);

  // Weekly brief job — default Monday 9 AM
  briefJob = new Cron(config.briefSchedule, async () => {
    log.info('Scheduled brief generation starting...');
    try {
      const { createGenerateBriefTool } = await import('../tools/generate-brief.js');
      const tool = createGenerateBriefTool(deps);
      const result = await tool.execute({ brief_type: 'weekly' });
      log.info('Scheduled brief complete:', result);
    } catch (err) {
      log.error('Scheduled brief failed:', err instanceof Error ? err.message : String(err));
    }
  });
  log.info(`Brief scheduler started: ${config.briefSchedule}`);
}

export function stopScheduler(): void {
  if (fetchJob) { fetchJob.stop(); fetchJob = null; }
  if (briefJob) { briefJob.stop(); briefJob = null; }
  log.info('Scheduler stopped');
}
