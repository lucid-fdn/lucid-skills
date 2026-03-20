import type { ToolDefinition } from './types.js';
import type { PluginConfig } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { searchLeads } from '../db/leads.js';
import { searchCompanies } from '../db/companies.js';
import { formatNumber } from '../utils/text.js';
import { logger } from '../utils/logger.js';

interface SearchProspectsParams {
  query: string;
  type?: 'leads' | 'companies' | 'all';
  limit?: number;
}

interface SearchProspectsDeps {
  config: PluginConfig;
  db: SupabaseClient;
}

export function createSearchProspectsTool(deps: SearchProspectsDeps): ToolDefinition<SearchProspectsParams> {
  return {
    name: 'prospect_search_prospects',
    description:
      'Full-text search across leads and companies in the database. Search by name, email, company, domain, title, or description.',
    params: {
      query: { type: 'string', required: true, description: 'Search query' },
      type: {
        type: 'enum',
        required: false,
        values: ['leads', 'companies', 'all'],
        default: 'all',
        description: 'Search type',
      },
      limit: { type: 'number', required: false, min: 1, max: 100, default: 25, description: 'Maximum results' },
    },
    execute: async (params: SearchProspectsParams): Promise<string> => {
      const searchType = params.type ?? 'all';
      const limit = params.limit ?? 25;
      logger.info(`Searching prospects: "${params.query}" (type: ${searchType})`);

      const lines: string[] = [`## Search Results: "${params.query}"`];

      if (searchType === 'leads' || searchType === 'all') {
        const leads = await searchLeads(deps.db, deps.config.tenantId, params.query);
        const limited = leads.slice(0, limit);

        lines.push(
          '',
          `### Leads (${limited.length} found)`,
          '| Name | Title | Company | Email | Score |',
          '|------|-------|---------|-------|-------|',
        );

        for (const lead of limited) {
          const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '-';
          lines.push(`| ${name} | ${lead.title ?? '-'} | ${lead.company_name ?? '-'} | ${lead.email ?? '-'} | ${lead.score} |`);
        }

        if (limited.length === 0) {
          lines.push('| _No leads found_ | | | | |');
        }
      }

      if (searchType === 'companies' || searchType === 'all') {
        const companies = await searchCompanies(deps.db, deps.config.tenantId, params.query);
        const limited = companies.slice(0, limit);

        lines.push(
          '',
          `### Companies (${limited.length} found)`,
          '| Company | Domain | Industry | Employees | Location |',
          '|---------|--------|----------|-----------|----------|',
        );

        for (const c of limited) {
          lines.push(
            `| ${c.name} | ${c.domain ?? '-'} | ${c.industry ?? '-'} | ${c.employee_count ? formatNumber(c.employee_count) : '-'} | ${c.location ?? '-'} |`,
          );
        }

        if (limited.length === 0) {
          lines.push('| _No companies found_ | | | | |');
        }
      }

      return lines.join('\n');
    },
  };
}
