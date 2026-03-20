// ---------------------------------------------------------------------------
// list-audits.ts -- List audits with filters
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { AUDIT_STATUSES } from '../types/common.js';
import { log } from '../utils/logger.js';

export function createListAuditsTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_list_audits',
    description:
      'List previous audits with optional filters by contract ID, status, and pagination.',
    params: {
      contract_id: {
        type: 'string',
        required: false,
        description: 'Filter by contract ID',
      },
      status: {
        type: 'enum',
        required: false,
        values: [...AUDIT_STATUSES],
        description: 'Filter by audit status',
      },
      limit: {
        type: 'number',
        required: false,
        min: 1,
        max: 100,
        description: 'Max results to return (default: 20)',
      },
    },
    execute: async (params: {
      contract_id?: string;
      status?: string;
      limit?: number;
    }): Promise<string> => {
      try {
        const { contract_id, status, limit = 20 } = params;

        const lines: string[] = [
          `## Audit List`,
          `- **Filters**: ${contract_id ? `contract=${contract_id}` : ''} ${status ? `status=${status}` : ''} ${!contract_id && !status ? 'none' : ''}`.trim(),
          `- **Limit**: ${limit}`,
          '',
          'Note: Database queries require Supabase connection. Configure AUDIT_SUPABASE_URL and AUDIT_SUPABASE_KEY.',
        ];

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_list_audits failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
