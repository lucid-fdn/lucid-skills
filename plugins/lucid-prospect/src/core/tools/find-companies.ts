import type { ToolDefinition } from './types.js';
import type { PluginConfig, Industry } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { INDUSTRIES } from '../types/common.js';
import { searchCompanies, listCompanies } from '../db/companies.js';
import { formatNumber } from '../utils/text.js';
import { logger } from '../utils/logger.js';

interface FindCompaniesParams {
  query: string;
  industry?: Industry;
  min_employees?: number;
  max_employees?: number;
}

interface FindCompaniesDeps {
  config: PluginConfig;
  db: SupabaseClient;
}

export function createFindCompaniesTool(deps: FindCompaniesDeps): ToolDefinition<FindCompaniesParams> {
  return {
    name: 'prospect_find_companies',
    description:
      'Search for companies in the database matching criteria like industry, employee count, and keywords.',
    params: {
      query: { type: 'string', required: true, description: 'Search query for company name, domain, or description' },
      industry: { type: 'enum', required: false, values: [...INDUSTRIES], description: 'Filter by industry' },
      min_employees: { type: 'number', required: false, min: 0, description: 'Minimum employee count' },
      max_employees: { type: 'number', required: false, min: 0, description: 'Maximum employee count' },
    },
    execute: async (params: FindCompaniesParams): Promise<string> => {
      logger.info(`Finding companies: "${params.query}"`);

      let results;
      if (params.industry || params.min_employees || params.max_employees) {
        results = await listCompanies(deps.db, deps.config.tenantId, {
          industry: params.industry,
          minEmployees: params.min_employees,
          maxEmployees: params.max_employees,
          limit: 50,
        });
        // Filter by query text
        const q = params.query.toLowerCase();
        results = results.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.domain ?? '').toLowerCase().includes(q) ||
            (c.description ?? '').toLowerCase().includes(q),
        );
      } else {
        results = await searchCompanies(deps.db, deps.config.tenantId, params.query);
      }

      const lines: string[] = [
        `## Company Search Results`,
        `**Query:** ${params.query}`,
        `**Found:** ${results.length} companies`,
        '',
        '| # | Company | Domain | Industry | Employees | Funding | Location |',
        '|---|---------|--------|----------|-----------|---------|----------|',
      ];

      for (let i = 0; i < results.length; i++) {
        const c = results[i];
        lines.push(
          `| ${i + 1} | ${c.name} | ${c.domain ?? '-'} | ${c.industry ?? '-'} | ${c.employee_count ? formatNumber(c.employee_count) : '-'} | ${c.funding_total ? '$' + formatNumber(c.funding_total) : '-'} | ${c.location ?? '-'} |`,
        );
      }

      if (results.length === 0) {
        lines.push('', '_No companies found. Try enriching companies first with `prospect_enrich_company`._');
      }

      return lines.join('\n');
    },
  };
}
