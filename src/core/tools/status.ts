// ---------------------------------------------------------------------------
// status.ts -- System status overview tool
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { PluginConfig } from '../types/index.js';
import {
  listCompetitors,
  listMonitors,
  listSignals,
} from '../db/index.js';
import { log } from '../utils/index.js';

interface StatusDeps {
  config: PluginConfig;
}

export function createStatusTool(deps: StatusDeps): ToolDefinition {
  return {
    name: 'compete_status',
    description:
      'Get an overview of the competitive intelligence system: competitor count, monitor count, signal counts by severity, and last fetch time.',
    params: {},
    execute: async (): Promise<string> => {
      try {
        const [competitors, monitors, signals] = await Promise.all([
          listCompetitors(deps.config.tenantId),
          listMonitors(deps.config.tenantId),
          listSignals(deps.config.tenantId, { daysBack: 30 }),
        ]);

        // Count signals by severity
        const severityCounts: Record<string, number> = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        };
        for (const s of signals) {
          severityCounts[s.severity] = (severityCounts[s.severity] ?? 0) + 1;
        }

        // Find last fetch time
        let lastFetch = 'never';
        for (const m of monitors) {
          if (m.last_fetched_at) {
            if (lastFetch === 'never' || m.last_fetched_at > lastFetch) {
              lastFetch = m.last_fetched_at;
            }
          }
        }

        // Count enabled/disabled monitors
        const enabledMonitors = monitors.filter((m) => m.enabled).length;
        const disabledMonitors = monitors.length - enabledMonitors;

        // Count monitors with errors
        const errorMonitors = monitors.filter((m) => m.last_error).length;

        const lines = [
          '=== Compete Status ===',
          '',
          `Competitors: ${competitors.length}`,
          `Monitors: ${monitors.length} (${enabledMonitors} enabled, ${disabledMonitors} disabled)`,
          errorMonitors > 0 ? `Monitors with errors: ${errorMonitors}` : '',
          `Last fetch: ${lastFetch}`,
          '',
          `Signals (last 30 days): ${signals.length}`,
          `  Critical: ${severityCounts.critical}`,
          `  High:     ${severityCounts.high}`,
          `  Medium:   ${severityCounts.medium}`,
          `  Low:      ${severityCounts.low}`,
        ].filter(Boolean);

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_status failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}
