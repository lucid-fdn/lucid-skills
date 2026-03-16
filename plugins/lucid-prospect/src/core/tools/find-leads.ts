import type { ToolDefinition } from './types.js';
import type { PluginConfig, ProviderRegistry, LeadSearchQuery, Industry, CompanySize } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { INDUSTRIES, COMPANY_SIZES } from '../types/common.js';
import { upsertLead } from '../db/leads.js';
import { logger } from '../utils/logger.js';

interface FindLeadsParams {
  query: string;
  title?: string;
  industry?: Industry;
  company_size?: CompanySize;
  location?: string;
  limit?: number;
}

interface FindLeadsDeps {
  config: PluginConfig;
  db: SupabaseClient;
  registry: ProviderRegistry;
}

export function createFindLeadsTool(deps: FindLeadsDeps): ToolDefinition<FindLeadsParams> {
  return {
    name: 'prospect_find_leads',
    description:
      'Search for leads across all configured providers (Apollo, Hunter, Clearbit, Crunchbase). Returns deduplicated results with contact details and stores them in the database.',
    params: {
      query: { type: 'string', required: true, description: 'Search query (e.g., "marketing managers at SaaS companies")' },
      title: { type: 'string', required: false, description: 'Filter by job title (e.g., "VP of Sales")' },
      industry: { type: 'enum', required: false, values: [...INDUSTRIES], description: 'Filter by industry' },
      company_size: { type: 'enum', required: false, values: [...COMPANY_SIZES], description: 'Filter by company size' },
      location: { type: 'string', required: false, description: 'Filter by location (e.g., "San Francisco, CA")' },
      limit: { type: 'number', required: false, min: 1, max: 100, default: 25, description: 'Maximum results to return' },
    },
    execute: async (params: FindLeadsParams): Promise<string> => {
      const searchQuery: LeadSearchQuery = {
        query: params.query,
        title: params.title,
        industry: params.industry,
        companySize: params.company_size,
        location: params.location,
        limit: params.limit ?? 25,
      };

      logger.info(`Finding leads: "${params.query}"`);

      const results = await deps.registry.findLeads(searchQuery);

      // Store results in DB
      let storedCount = 0;
      for (const result of results) {
        try {
          await upsertLead(deps.db, deps.config.tenantId, {
            email: result.email,
            first_name: result.first_name,
            last_name: result.last_name,
            title: result.title,
            company_name: result.company_name,
            company_domain: result.company_domain,
            linkedin_url: result.linkedin_url,
            phone: result.phone,
            lead_source: result.source as any,
            status: 'new',
          });
          storedCount++;
        } catch (err) {
          logger.warn('Failed to store lead:', err);
        }
      }

      // Format output
      const lines: string[] = [
        `## Lead Search Results`,
        `**Query:** ${params.query}`,
        `**Found:** ${results.length} leads | **Stored:** ${storedCount}`,
        '',
        '| # | Name | Title | Company | Email | Source |',
        '|---|------|-------|---------|-------|--------|',
      ];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Unknown';
        lines.push(
          `| ${i + 1} | ${name} | ${r.title ?? '-'} | ${r.company_name ?? '-'} | ${r.email ?? '-'} | ${r.source} |`,
        );
      }

      if (results.length === 0) {
        lines.push('', '_No leads found. Try broadening your search criteria._');
      }

      return lines.join('\n');
    },
  };
}
