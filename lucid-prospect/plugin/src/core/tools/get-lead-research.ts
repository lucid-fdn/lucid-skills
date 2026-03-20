import type { ToolDefinition } from './types.js';
import type { PluginConfig } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getLeadByEmail } from '../db/leads.js';
import { getCompanyByDomain } from '../db/companies.js';
import { buildLeadResearchPrompt } from '../analysis/prompts.js';
import { logger } from '../utils/logger.js';

interface GetLeadResearchParams {
  email: string;
}

interface GetLeadResearchDeps {
  config: PluginConfig;
  db: SupabaseClient;
}

export function createGetLeadResearchTool(deps: GetLeadResearchDeps): ToolDefinition<GetLeadResearchParams> {
  return {
    name: 'prospect_get_lead_research',
    description:
      'Generate AI-ready research data about a lead including their profile, company details, enrichment data, and suggested talking points. Returns structured prompt data for further AI analysis.',
    params: {
      email: { type: 'string', required: true, description: 'Email of the lead to research' },
    },
    execute: async (params: GetLeadResearchParams): Promise<string> => {
      const { email } = params;
      logger.info(`Generating research for: ${email}`);

      const lead = await getLeadByEmail(deps.db, deps.config.tenantId, email);
      if (!lead) {
        return `No lead found with email: ${email}. Please add or enrich this lead first using \`prospect_enrich_lead\`.`;
      }

      // Try to find associated company
      let company = null;
      if (lead.company_domain) {
        company = await getCompanyByDomain(deps.db, deps.config.tenantId, lead.company_domain);
      }

      const promptData = buildLeadResearchPrompt(lead, company);

      const lines: string[] = [
        `## Lead Research: ${[lead.first_name, lead.last_name].filter(Boolean).join(' ') || email}`,
        '',
        '---',
        '',
        promptData.leadContext,
        '',
        promptData.companyContext,
        '',
        '---',
        '',
        '### System Prompt for AI Analysis',
        '```',
        promptData.systemPrompt,
        '```',
        '',
        '### Suggested Follow-up Actions',
        `- Enrich further: \`prospect_enrich_lead { "email": "${email}" }\``,
      ];

      if (lead.company_domain) {
        lines.push(`- Company intel: \`prospect_enrich_company { "domain": "${lead.company_domain}" }\``);
        lines.push(`- Find colleagues: \`prospect_find_emails { "domain": "${lead.company_domain}" }\``);
      }

      lines.push(`- Score this lead: \`prospect_score_leads { "rescore": true }\``);

      return lines.join('\n');
    },
  };
}
