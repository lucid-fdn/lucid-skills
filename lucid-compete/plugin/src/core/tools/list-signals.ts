// ---------------------------------------------------------------------------
// list-signals.ts -- Tool to list competitive signals with filters
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { PluginConfig, Severity, SignalType } from '../types/index.js';
import { SEVERITIES, SIGNAL_TYPES } from '../types/index.js';
import { listSignals } from '../db/index.js';
import { log } from '../utils/index.js';

interface ListSignalsDeps {
  config: PluginConfig;
}

interface ListSignalsParams {
  competitor_id?: number;
  severity?: string;
  signal_type?: string;
  limit?: number;
  days_back?: number;
}

export function createListSignalsTool(deps: ListSignalsDeps): ToolDefinition {
  return {
    name: 'compete_list_signals',
    description:
      'List competitive signals with optional filters by competitor, severity, type, and date range.',
    params: {
      competitor_id: {
        type: 'number',
        required: false,
        description: 'Filter signals by competitor ID',
      },
      severity: {
        type: 'enum',
        required: false,
        description: 'Filter by severity level',
        values: [...SEVERITIES],
      },
      signal_type: {
        type: 'enum',
        required: false,
        description: 'Filter by signal type',
        values: [...SIGNAL_TYPES],
      },
      limit: {
        type: 'number',
        required: false,
        description: 'Maximum number of signals to return (default: 50)',
        default: 50,
      },
      days_back: {
        type: 'number',
        required: false,
        description: 'Only show signals from the last N days (default: 30)',
        default: 30,
      },
    },
    execute: async (params: ListSignalsParams): Promise<string> => {
      try {
        const signals = await listSignals(deps.config.tenantId, {
          competitorId: params.competitor_id,
          severity: params.severity as Severity | undefined,
          signalType: params.signal_type as SignalType | undefined,
          limit: params.limit ?? 50,
          daysBack: params.days_back ?? 30,
        });

        if (signals.length === 0) {
          return 'No signals found matching the criteria.';
        }

        const lines = [`Signals (${signals.length}):`];
        for (const s of signals) {
          lines.push(
            `  - [${s.id}] [${s.severity.toUpperCase()}] ${s.signal_type} | ${s.title} | ${s.detected_at}`,
          );
          if (s.summary) {
            lines.push(`    ${s.summary}`);
          }
        }
        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_list_signals failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}
