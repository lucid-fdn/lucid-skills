import type { ToolDefinition } from './types.js';
import type { PluginConfig, ProviderRegistry } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { countLeads } from '../db/leads.js';
import { countCompanies } from '../db/companies.js';
import { countEnrichments } from '../db/enrichments.js';
import { PLUGIN_NAME, PLUGIN_VERSION } from '../plugin-id.js';
import { logger } from '../utils/logger.js';

interface StatusDeps {
  config: PluginConfig;
  db: SupabaseClient;
  registry: ProviderRegistry;
}

export function createStatusTool(deps: StatusDeps): ToolDefinition<Record<string, never>> {
  return {
    name: 'prospect_status',
    description:
      'Get system health and status: lead count, company count, configured providers, enrichment statistics, and configuration summary.',
    params: {},
    execute: async (): Promise<string> => {
      logger.info('Getting system status');

      let leadCount = 0;
      let companyCount = 0;
      let enrichmentCount = 0;
      let dbStatus = 'Connected';

      try {
        leadCount = await countLeads(deps.db, deps.config.tenantId);
        companyCount = await countCompanies(deps.db, deps.config.tenantId);
        enrichmentCount = await countEnrichments(deps.db, deps.config.tenantId);
      } catch (err) {
        dbStatus = `Error: ${err instanceof Error ? err.message : 'Unknown'}`;
      }

      const configuredProviders = deps.registry.getConfigured();
      const allProviders = deps.registry.providers;

      const lines: string[] = [
        `## ${PLUGIN_NAME} v${PLUGIN_VERSION}`,
        '',
        '### Database',
        `- **Status:** ${dbStatus}`,
        `- **Leads:** ${leadCount}`,
        `- **Companies:** ${companyCount}`,
        `- **Enrichments:** ${enrichmentCount}`,
        '',
        '### Providers',
        '| Provider | Status |',
        '|----------|--------|',
      ];

      for (const provider of allProviders) {
        const status = provider.isConfigured() ? 'Configured' : 'Not Configured';
        lines.push(`| ${provider.name} | ${status} |`);
      }

      if (allProviders.length === 0) {
        lines.push('| _No providers registered_ | - |');
      }

      lines.push(
        '',
        '### Configuration',
        `- **Tenant:** ${deps.config.tenantId}`,
        `- **Score Threshold:** ${deps.config.defaultScoreThreshold}`,
        `- **Enrich Schedule:** ${deps.config.enrichSchedule}`,
        `- **Active Providers:** ${configuredProviders.length}/${allProviders.length}`,
      );

      return lines.join('\n');
    },
  };
}
