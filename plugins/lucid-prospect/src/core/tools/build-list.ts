import type { ToolDefinition } from './types.js';
import type { PluginConfig, ProviderRegistry, IcpProfile, Industry, CompanySize } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { INDUSTRIES, COMPANY_SIZES } from '../types/common.js';
import { createCampaign, addLeadToCampaign } from '../db/campaigns.js';
import { listLeads } from '../db/leads.js';
import { matchLeadToIcp } from '../analysis/icp-matcher.js';
import { logger } from '../utils/logger.js';

interface BuildListParams {
  name: string;
  icp?: {
    industries?: Industry[];
    company_sizes?: CompanySize[];
    titles?: string[];
    min_score?: number;
  };
  auto_enrich?: boolean;
}

interface BuildListDeps {
  config: PluginConfig;
  db: SupabaseClient;
  registry: ProviderRegistry;
}

export function createBuildListTool(deps: BuildListDeps): ToolDefinition<BuildListParams> {
  return {
    name: 'prospect_build_list',
    description:
      'Create a targeted lead list (campaign) from ICP criteria. Automatically finds matching leads in the database and optionally triggers enrichment.',
    params: {
      name: { type: 'string', required: true, description: 'Name for the lead list/campaign' },
      icp: {
        type: 'object',
        required: false,
        description: 'Ideal Customer Profile criteria',
        properties: {
          industries: {
            type: 'array',
            required: false,
            description: 'Target industries',
            items: { type: 'enum', values: [...INDUSTRIES] },
          },
          company_sizes: {
            type: 'array',
            required: false,
            description: 'Target company sizes',
            items: { type: 'enum', values: [...COMPANY_SIZES] },
          },
          titles: {
            type: 'array',
            required: false,
            description: 'Target job titles',
            items: { type: 'string' },
          },
          min_score: {
            type: 'number',
            required: false,
            min: 0,
            max: 100,
            description: 'Minimum lead score',
          },
        },
      },
      auto_enrich: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Auto-enrich leads that lack enrichment data',
      },
    },
    execute: async (params: BuildListParams): Promise<string> => {
      logger.info(`Building list: ${params.name}`);

      const icpProfile: IcpProfile = {
        industries: params.icp?.industries ?? [],
        company_sizes: params.icp?.company_sizes ?? [],
        titles: params.icp?.titles ?? [],
        technologies: [],
        locations: [],
      };

      // Create campaign
      const campaign = await createCampaign(deps.db, deps.config.tenantId, {
        name: params.name,
        description: `Auto-built list from ICP criteria`,
        target_icp: icpProfile as unknown as Record<string, unknown>,
        status: 'draft',
      });

      // Find matching leads
      const allLeads = await listLeads(deps.db, deps.config.tenantId, {
        minScore: params.icp?.min_score ?? 0,
        limit: 500,
      });

      let matchedCount = 0;
      let enrichedCount = 0;

      for (const lead of allLeads) {
        const matchScore = matchLeadToIcp(lead, icpProfile);
        if (matchScore >= 30) {
          await addLeadToCampaign(deps.db, campaign.id, lead.id);
          matchedCount++;

          // Auto-enrich if requested and lead lacks enrichment
          if (params.auto_enrich && lead.email && Object.keys(lead.enrichment_data).length === 0) {
            try {
              const enrichment = await deps.registry.enrichLead(lead.email);
              logger.info(`Auto-enriched: ${lead.email} via ${enrichment.provider}`);
              enrichedCount++;
            } catch (err) {
              logger.warn(`Auto-enrich failed for ${lead.email}:`, err);
            }
          }
        }
      }

      const lines: string[] = [
        `## List Created: ${params.name}`,
        '',
        `**Campaign ID:** ${campaign.id}`,
        `**Leads Matched:** ${matchedCount}`,
        `**Leads Enriched:** ${enrichedCount}`,
        '',
        '### ICP Criteria',
      ];

      if (icpProfile.industries.length > 0) lines.push(`- **Industries:** ${icpProfile.industries.join(', ')}`);
      if (icpProfile.company_sizes.length > 0) lines.push(`- **Company Sizes:** ${icpProfile.company_sizes.join(', ')}`);
      if (icpProfile.titles.length > 0) lines.push(`- **Titles:** ${icpProfile.titles.join(', ')}`);
      if (params.icp?.min_score) lines.push(`- **Min Score:** ${params.icp.min_score}`);

      if (matchedCount === 0) {
        lines.push('', '_No matching leads found. Try broadening your ICP criteria or adding more leads first._');
      }

      return lines.join('\n');
    },
  };
}
