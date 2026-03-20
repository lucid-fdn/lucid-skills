// ---------------------------------------------------------------------------
// search.ts -- Full-text search tool for competitive signals
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { PluginConfig } from '../types/index.js';
import { searchSignals } from '../db/index.js';
import { log } from '../utils/index.js';

interface SearchDeps {
  config: PluginConfig;
}

interface SearchParams {
  query: string;
  limit?: number;
}

export function createSearchTool(deps: SearchDeps): ToolDefinition {
  return {
    name: 'compete_search',
    description:
      'Full-text search across all competitive signals (title, summary, content).',
    params: {
      query: {
        type: 'string',
        required: true,
        description: 'The search query',
      },
      limit: {
        type: 'number',
        required: false,
        description: 'Maximum number of results to return (default: 20)',
        default: 20,
      },
    },
    execute: async (params: SearchParams): Promise<string> => {
      try {
        const results = await searchSignals(
          deps.config.tenantId,
          params.query,
          params.limit ?? 20,
        );

        if (results.length === 0) {
          return `No signals found matching "${params.query}".`;
        }

        const lines = [`Search results for "${params.query}" (${results.length}):`];
        for (const s of results) {
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
        log.error('compete_search failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}
