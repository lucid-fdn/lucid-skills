import type { ToolDefinition } from './types.js';
import type { PluginConfig, CampaignStatus } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CAMPAIGN_STATUSES } from '../types/common.js';
import { createCampaign, getCampaignById, listCampaigns, updateCampaign } from '../db/campaigns.js';
import { logger } from '../utils/logger.js';
import { formatRelative } from '../utils/date.js';

interface ManageCampaignParams {
  action: 'create' | 'update' | 'list' | 'get';
  campaign_id?: string;
  name?: string;
  description?: string;
  status?: CampaignStatus;
}

interface ManageCampaignDeps {
  config: PluginConfig;
  db: SupabaseClient;
}

export function createManageCampaignTool(deps: ManageCampaignDeps): ToolDefinition<ManageCampaignParams> {
  return {
    name: 'prospect_manage_campaign',
    description:
      'Create, update, list, or get campaigns/lead lists. Campaigns organize leads for targeted outreach.',
    params: {
      action: { type: 'enum', required: true, values: ['create', 'update', 'list', 'get'], description: 'Action to perform' },
      campaign_id: { type: 'string', required: false, description: 'Campaign ID (required for update/get)' },
      name: { type: 'string', required: false, description: 'Campaign name (required for create)' },
      description: { type: 'string', required: false, description: 'Campaign description' },
      status: { type: 'enum', required: false, values: [...CAMPAIGN_STATUSES], description: 'Campaign status' },
    },
    execute: async (params: ManageCampaignParams): Promise<string> => {
      logger.info(`Campaign action: ${params.action}`);

      switch (params.action) {
        case 'create': {
          if (!params.name) return 'Error: `name` is required to create a campaign.';

          const campaign = await createCampaign(deps.db, deps.config.tenantId, {
            name: params.name,
            description: params.description ?? null,
            status: params.status ?? 'draft',
          });

          return [
            `## Campaign Created`,
            '',
            `**ID:** ${campaign.id}`,
            `**Name:** ${campaign.name}`,
            `**Status:** ${campaign.status}`,
            `**Created:** ${formatRelative(campaign.created_at)}`,
          ].join('\n');
        }

        case 'update': {
          if (!params.campaign_id) return 'Error: `campaign_id` is required to update a campaign.';

          const updates: Record<string, unknown> = {};
          if (params.name) updates.name = params.name;
          if (params.description) updates.description = params.description;
          if (params.status) updates.status = params.status;

          const updated = await updateCampaign(deps.db, params.campaign_id, updates as any);

          return [
            `## Campaign Updated`,
            '',
            `**ID:** ${updated.id}`,
            `**Name:** ${updated.name}`,
            `**Status:** ${updated.status}`,
            `**Leads:** ${updated.lead_count}`,
          ].join('\n');
        }

        case 'get': {
          if (!params.campaign_id) return 'Error: `campaign_id` is required to get a campaign.';

          const campaign = await getCampaignById(deps.db, params.campaign_id);
          if (!campaign) return `Campaign not found: ${params.campaign_id}`;

          return [
            `## Campaign: ${campaign.name}`,
            '',
            `**ID:** ${campaign.id}`,
            `**Status:** ${campaign.status}`,
            `**Leads:** ${campaign.lead_count}`,
            `**Description:** ${campaign.description ?? '-'}`,
            `**Created:** ${formatRelative(campaign.created_at)}`,
            `**Updated:** ${formatRelative(campaign.updated_at)}`,
          ].join('\n');
        }

        case 'list': {
          const campaigns = await listCampaigns(deps.db, deps.config.tenantId, params.status);

          const lines: string[] = [
            `## Campaigns`,
            `**Total:** ${campaigns.length}`,
            '',
            '| # | Name | Status | Leads | Created |',
            '|---|------|--------|-------|---------|',
          ];

          for (let i = 0; i < campaigns.length; i++) {
            const c = campaigns[i];
            lines.push(`| ${i + 1} | ${c.name} | ${c.status} | ${c.lead_count} | ${formatRelative(c.created_at)} |`);
          }

          if (campaigns.length === 0) {
            lines.push('', '_No campaigns found. Create one with action: "create"._');
          }

          return lines.join('\n');
        }
      }
    },
  };
}
