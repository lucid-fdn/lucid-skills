import type { ToolDefinition } from './types.js';
import type { PluginConfig, IcpProfile, Industry, CompanySize } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { INDUSTRIES, COMPANY_SIZES } from '../types/common.js';
import { getLeadByEmail } from '../db/leads.js';
import { getCompanyByDomain } from '../db/companies.js';
import { matchLeadToIcp, matchCompanyToIcp } from '../analysis/icp-matcher.js';
import { logger } from '../utils/logger.js';

interface GetIcpMatchParams {
  email_or_domain: string;
  icp?: {
    industries?: Industry[];
    company_sizes?: CompanySize[];
    titles?: string[];
    technologies?: string[];
    min_funding?: number;
    locations?: string[];
  };
}

interface GetIcpMatchDeps {
  config: PluginConfig;
  db: SupabaseClient;
}

export function createGetIcpMatchTool(deps: GetIcpMatchDeps): ToolDefinition<GetIcpMatchParams> {
  return {
    name: 'prospect_get_icp_match',
    description:
      'Calculate how well a lead (by email) or company (by domain) matches your Ideal Customer Profile. Returns a score (0-100) with detailed breakdown.',
    params: {
      email_or_domain: {
        type: 'string',
        required: true,
        description: 'Email address (for lead) or domain (for company) to match against ICP',
      },
      icp: {
        type: 'object',
        required: false,
        description: 'ICP criteria to match against. If not provided, uses default criteria.',
        properties: {
          industries: {
            type: 'array',
            required: false,
            items: { type: 'enum', values: [...INDUSTRIES] },
          },
          company_sizes: {
            type: 'array',
            required: false,
            items: { type: 'enum', values: [...COMPANY_SIZES] },
          },
          titles: { type: 'array', required: false, items: { type: 'string' } },
          technologies: { type: 'array', required: false, items: { type: 'string' } },
          min_funding: { type: 'number', required: false },
          locations: { type: 'array', required: false, items: { type: 'string' } },
        },
      },
    },
    execute: async (params: GetIcpMatchParams): Promise<string> => {
      const { email_or_domain } = params;
      logger.info(`Getting ICP match for: ${email_or_domain}`);

      const icpProfile: IcpProfile = {
        industries: params.icp?.industries ?? [],
        company_sizes: params.icp?.company_sizes ?? [],
        titles: params.icp?.titles ?? [],
        technologies: params.icp?.technologies ?? [],
        min_funding: params.icp?.min_funding,
        locations: params.icp?.locations ?? [],
      };

      const isEmail = email_or_domain.includes('@');

      if (isEmail) {
        const lead = await getLeadByEmail(deps.db, deps.config.tenantId, email_or_domain);
        if (!lead) {
          return `No lead found with email: ${email_or_domain}. Please add or enrich this lead first.`;
        }

        const score = matchLeadToIcp(lead, icpProfile);
        const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown';

        const lines: string[] = [
          `## ICP Match: ${name} (${email_or_domain})`,
          '',
          `**Match Score:** ${score}/100`,
          `**Rating:** ${getRating(score)}`,
          '',
          '### Match Breakdown',
          `- **Title:** ${lead.title ?? 'Unknown'}`,
          `- **Company:** ${lead.company_name ?? 'Unknown'}`,
          `- **Score:** ${lead.score}/100`,
        ];

        return lines.join('\n');
      } else {
        const company = await getCompanyByDomain(deps.db, deps.config.tenantId, email_or_domain);
        if (!company) {
          return `No company found with domain: ${email_or_domain}. Please enrich this company first.`;
        }

        const score = matchCompanyToIcp(company, icpProfile);

        const lines: string[] = [
          `## ICP Match: ${company.name} (${email_or_domain})`,
          '',
          `**Match Score:** ${score}/100`,
          `**Rating:** ${getRating(score)}`,
          '',
          '### Company Profile',
          `- **Industry:** ${company.industry ?? 'Unknown'}`,
          `- **Size:** ${company.company_size ?? 'Unknown'}`,
          `- **Employees:** ${company.employee_count ?? 'Unknown'}`,
          `- **Funding:** ${company.funding_total ? `$${company.funding_total.toLocaleString()}` : 'Unknown'}`,
          `- **Technologies:** ${company.technologies.join(', ') || 'Unknown'}`,
          `- **Location:** ${company.location ?? 'Unknown'}`,
        ];

        return lines.join('\n');
      }
    },
  };
}

function getRating(score: number): string {
  if (score >= 80) return 'Strong Fit';
  if (score >= 60) return 'Good Fit';
  if (score >= 40) return 'Moderate Fit';
  if (score >= 20) return 'Weak Fit';
  return 'Poor Fit';
}
