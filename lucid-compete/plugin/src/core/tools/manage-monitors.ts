// ---------------------------------------------------------------------------
// manage-monitors.ts -- CRUD tools for monitor management
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { PluginConfig } from '../types/index.js';
import { MONITOR_TYPES } from '../types/index.js';
import { createMonitor, listMonitors, deleteMonitor } from '../db/index.js';
import { log } from '../utils/index.js';

interface MonitorDeps {
  config: PluginConfig;
}

// ---------------------------------------------------------------------------
// Add Monitor
// ---------------------------------------------------------------------------

interface AddMonitorParams {
  competitor_id: number;
  monitor_type: string;
  url: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export function createAddMonitorTool(deps: MonitorDeps): ToolDefinition {
  return {
    name: 'compete_add_monitor',
    description: 'Add a new monitor to track a specific source for a competitor.',
    params: {
      competitor_id: {
        type: 'number',
        required: true,
        description: 'The competitor ID this monitor belongs to',
      },
      monitor_type: {
        type: 'enum',
        required: true,
        description: 'The type of monitor source',
        values: [...MONITOR_TYPES],
      },
      url: {
        type: 'string',
        required: true,
        description: 'The URL to monitor',
      },
      config: {
        type: 'object',
        required: false,
        description: 'Optional configuration for the monitor',
      },
      enabled: {
        type: 'boolean',
        required: false,
        description: 'Whether the monitor is enabled (default: true)',
        default: true,
      },
    },
    execute: async (params: AddMonitorParams): Promise<string> => {
      try {
        const monitor = await createMonitor({
          tenant_id: deps.config.tenantId,
          competitor_id: String(params.competitor_id),
          monitor_type: params.monitor_type as typeof MONITOR_TYPES[number],
          url: params.url,
          config: params.config ?? {},
          enabled: params.enabled ?? true,
        });
        return `Monitor created (id: ${monitor.id}, type: ${monitor.monitor_type}, url: ${monitor.url}).`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_add_monitor failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// List Monitors
// ---------------------------------------------------------------------------

interface ListMonitorsParams {
  competitor_id?: number;
  enabled_only?: boolean;
}

export function createListMonitorsTool(deps: MonitorDeps): ToolDefinition {
  return {
    name: 'compete_list_monitors',
    description: 'List monitors, optionally filtered by competitor or enabled status.',
    params: {
      competitor_id: {
        type: 'number',
        required: false,
        description: 'Filter monitors by competitor ID',
      },
      enabled_only: {
        type: 'boolean',
        required: false,
        description: 'Show only enabled monitors',
      },
    },
    execute: async (params: ListMonitorsParams): Promise<string> => {
      try {
        const monitors = await listMonitors(deps.config.tenantId, {
          competitorId: params.competitor_id,
          enabled: params.enabled_only === true ? true : undefined,
        });

        if (monitors.length === 0) {
          return 'No monitors found.';
        }

        const lines = [`Monitors (${monitors.length}):`];
        for (const m of monitors) {
          const status = m.enabled ? 'enabled' : 'disabled';
          const lastFetch = m.last_fetched_at ?? 'never';
          const error = m.last_error ? ` | error: ${m.last_error}` : '';
          lines.push(
            `  - [${m.id}] ${m.monitor_type} | ${m.url} | ${status} | last fetch: ${lastFetch}${error}`,
          );
        }
        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_list_monitors failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Remove Monitor
// ---------------------------------------------------------------------------

interface RemoveMonitorParams {
  id: number;
}

export function createRemoveMonitorTool(_deps: MonitorDeps): ToolDefinition {
  return {
    name: 'compete_remove_monitor',
    description: 'Remove a monitor by ID.',
    params: {
      id: {
        type: 'number',
        required: true,
        description: 'The monitor ID to remove',
      },
    },
    execute: async (params: RemoveMonitorParams): Promise<string> => {
      try {
        await deleteMonitor(params.id);
        return `Monitor (id: ${params.id}) removed successfully.`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_remove_monitor failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}
