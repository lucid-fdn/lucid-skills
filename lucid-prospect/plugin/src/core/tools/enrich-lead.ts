import type { ToolDefinition } from './types.js';
import type { PluginConfig, ProviderRegistry } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getLeadByEmail, updateLead, upsertLead } from '../db/leads.js';
import { logEnrichment } from '../db/enrichments.js';
import { logger } from '../utils/logger.js';

interface EnrichLeadParams {
  email: string;
}

interface EnrichLeadDeps {
  config: PluginConfig;
  db: SupabaseClient;
  registry: ProviderRegistry;
}

export function createEnrichLeadTool(deps: EnrichLeadDeps): ToolDefinition<EnrichLeadParams> {
  return {
    name: 'prospect_enrich_lead',
    description:
      'Enrich a lead by email using all available providers (Apollo, Hunter, Clearbit). Merges data from multiple sources and updates the database.',
    params: {
      email: { type: 'string', required: true, description: 'Email address of the lead to enrich' },
    },
    execute: async (params: EnrichLeadParams): Promise<string> => {
      const { email } = params;
      logger.info(`Enriching lead: ${email}`);

      const enrichment = await deps.registry.enrichLead(email);

      // Find or create lead
      let lead = await getLeadByEmail(deps.db, deps.config.tenantId, email);
      if (!lead) {
        lead = await upsertLead(deps.db, deps.config.tenantId, {
          email,
          first_name: enrichment.first_name ?? null,
          last_name: enrichment.last_name ?? null,
          title: enrichment.title ?? null,
          company_name: enrichment.company_name ?? null,
          company_domain: enrichment.company_domain ?? null,
          linkedin_url: enrichment.linkedin_url ?? null,
          phone: enrichment.phone ?? null,
          lead_source: 'manual',
        });
      }

      // Merge enrichment data
      const existingData = lead.enrichment_data ?? {};
      const mergedData = { ...existingData, ...enrichment };

      const updates: Record<string, unknown> = {
        enrichment_data: mergedData,
      };

      if (enrichment.first_name && !lead.first_name) updates.first_name = enrichment.first_name;
      if (enrichment.last_name && !lead.last_name) updates.last_name = enrichment.last_name;
      if (enrichment.title && !lead.title) updates.title = enrichment.title;
      if (enrichment.company_name && !lead.company_name) updates.company_name = enrichment.company_name;
      if (enrichment.company_domain && !lead.company_domain) updates.company_domain = enrichment.company_domain;
      if (enrichment.linkedin_url && !lead.linkedin_url) updates.linkedin_url = enrichment.linkedin_url;
      if (enrichment.phone && !lead.phone) updates.phone = enrichment.phone;

      const updated = await updateLead(deps.db, lead.id, updates as any);

      // Log enrichment
      await logEnrichment(deps.db, deps.config.tenantId, 'lead', lead.id, enrichment.provider, enrichment as Record<string, unknown>);

      const name = [updated.first_name, updated.last_name].filter(Boolean).join(' ') || 'Unknown';
      const lines: string[] = [
        `## Lead Enrichment Complete`,
        '',
        `**${name}** (${email})`,
        '',
        '| Field | Value |',
        '|-------|-------|',
        `| Title | ${updated.title ?? '-'} |`,
        `| Company | ${updated.company_name ?? '-'} |`,
        `| Domain | ${updated.company_domain ?? '-'} |`,
        `| LinkedIn | ${updated.linkedin_url ?? '-'} |`,
        `| Phone | ${updated.phone ?? '-'} |`,
        `| Source | ${enrichment.provider} |`,
      ];

      if (enrichment.location) lines.push(`| Location | ${enrichment.location} |`);
      if (enrichment.bio) lines.push(`| Bio | ${enrichment.bio} |`);
      if (enrichment.skills) lines.push(`| Skills | ${enrichment.skills.join(', ')} |`);

      return lines.join('\n');
    },
  };
}
