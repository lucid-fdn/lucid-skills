// ---------------------------------------------------------------------------
// fetch-now.ts -- On-demand fetch tool for monitors
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { PluginConfig, Fetcher, MonitorType, Notifier, NotifierType } from '../types/index.js';
import { classifySignal } from '../analysis/index.js';
import {
  listMonitors,
  getCompetitor,
  createSignals,
  updateMonitorFetchStatus,
} from '../db/index.js';
import { log } from '../utils/index.js';

interface FetchNowDeps {
  config: PluginConfig;
  fetcherRegistry: Map<MonitorType, Fetcher>;
  notifierRegistry: Map<NotifierType, Notifier>;
}

interface FetchNowParams {
  competitor_id?: number;
  monitor_id?: number;
}

export function createFetchNowTool(deps: FetchNowDeps): ToolDefinition {
  return {
    name: 'compete_fetch_now',
    description:
      'Fetch the latest data from monitors immediately. Can target a specific monitor, all monitors for a competitor, or all enabled monitors.',
    params: {
      competitor_id: {
        type: 'number',
        required: false,
        description: 'Fetch all monitors for this competitor',
      },
      monitor_id: {
        type: 'number',
        required: false,
        description: 'Fetch only this specific monitor',
      },
    },
    execute: async (params: FetchNowParams): Promise<string> => {
      try {
        let monitors = await listMonitors(deps.config.tenantId, {
          competitorId: params.competitor_id,
          enabled: true,
        });

        // If a specific monitor_id was given, filter to just that one
        if (params.monitor_id !== undefined) {
          monitors = monitors.filter((m) => m.id === String(params.monitor_id));
        }

        if (monitors.length === 0) {
          return 'No monitors found matching the criteria.';
        }

        let totalSignals = 0;
        let criticalCount = 0;
        let monitorsProcessed = 0;
        let monitorErrors = 0;

        for (const monitor of monitors) {
          const fetcher = deps.fetcherRegistry.get(monitor.monitor_type as MonitorType);
          if (!fetcher) continue;

          const competitor = await getCompetitor(Number(monitor.competitor_id));
          if (!competitor) continue;

          try {
            const result = await fetcher.fetch(monitor, competitor);

            // Classify and set severity
            const classifiedSignals = result.signals.map((s) => ({
              ...s,
              severity: classifySignal(s),
            }));

            if (classifiedSignals.length > 0) {
              await createSignals(classifiedSignals);
              totalSignals += classifiedSignals.length;
            }

            // Update monitor status
            const hash = (result.metadata as Record<string, unknown>)?.hash as
              | string
              | undefined;
            await updateMonitorFetchStatus(
              Number(monitor.id),
              new Date().toISOString(),
              hash,
              null,
            );

            // Alert on high/critical
            for (const signal of classifiedSignals) {
              if (signal.severity === 'critical' || signal.severity === 'high') {
                criticalCount++;
                // Fire alerts -- best effort
                for (const [, notifier] of deps.notifierRegistry) {
                  try {
                    await notifier.notify({
                      signal: signal as any,
                      competitor,
                      formattedMessage: signal.title,
                    });
                  } catch {
                    // Ignore alert failures
                  }
                }
              }
            }

            monitorsProcessed++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await updateMonitorFetchStatus(
              Number(monitor.id),
              new Date().toISOString(),
              undefined,
              msg,
            );
            monitorErrors++;
          }
        }

        const lines = [
          `Fetch complete.`,
          `  Monitors processed: ${monitorsProcessed}`,
          `  Signals detected: ${totalSignals}`,
          `  Critical/high signals: ${criticalCount}`,
        ];
        if (monitorErrors > 0) {
          lines.push(`  Errors: ${monitorErrors}`);
        }
        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_fetch_now failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}
