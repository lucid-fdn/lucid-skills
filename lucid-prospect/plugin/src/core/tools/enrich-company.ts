import type { ToolDefinition } from './types.js';
import type { PluginConfig, ProviderRegistry, Industry, CompanySize } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCompanyByDomain, upsertCompany, updateCompany } from '../db/companies.js';
import { logEnrichment } from '../db/enrichments.js';
import { logger } from '../utils/logger.js';
import { formatNumber } from '../utils/text.js';

interface EnrichCompanyParams {
  domain: string;
}

interface EnrichCompanyDeps {
  config: PluginConfig;
  db: SupabaseClient;
  registry: ProviderRegistry;
}

export function createEnrichCompanyTool(deps: EnrichCompanyDeps): ToolDefinition<EnrichCompanyParams> {
  return {
    name: 'prospect_enrich_company',
    description:
      'Enrich a company by domain using all available providers (Apollo, Clearbit, Crunchbase). Returns comprehensive company profile including funding, tech stack, and employee data.',
    params: {
      domain: { type: 'string', required: true, description: 'Company domain (e.g., "stripe.com")' },
    },
    execute: async (params: EnrichCompanyParams): Promise<string> => {
      const { domain } = params;
      logger.info(`Enriching company: ${domain}`);

      const enrichment = await deps.registry.enrichCompany(domain);

      // Find or create company
      let company = await getCompanyByDomain(deps.db, deps.config.tenantId, domain);

      const companyData: Record<string, unknown> = {
        name: enrichment.name ?? domain,
        domain,
        enrichment_data: enrichment as Record<string, unknown>,
      };

      if (enrichment.industry) companyData.industry = enrichment.industry as Industry;
      if (enrichment.description) companyData.description = enrichment.description;
      if (enrichment.employee_count) companyData.employee_count = enrichment.employee_count;
      if (enrichment.founded_year) companyData.founded_year = enrichment.founded_year;
      if (enrichment.funding_total) companyData.funding_total = enrichment.funding_total;
      if (enrichment.funding_stage) companyData.funding_stage = enrichment.funding_stage;
      if (enrichment.technologies) companyData.technologies = enrichment.technologies;
      if (enrichment.location) companyData.location = enrichment.location;
      if (enrichment.linkedin_url) companyData.linkedin_url = enrichment.linkedin_url;
      if (enrichment.website) companyData.website = enrichment.website;

      // Map employee count to company size
      if (enrichment.employee_count) {
        const ec = enrichment.employee_count;
        let size: CompanySize = '1-10';
        if (ec > 5000) size = '5000+';
        else if (ec > 1000) size = '1001-5000';
        else if (ec > 500) size = '501-1000';
        else if (ec > 200) size = '201-500';
        else if (ec > 50) size = '51-200';
        else if (ec > 10) size = '11-50';
        companyData.company_size = size;
      }

      if (company) {
        company = await updateCompany(deps.db, company.id, companyData as any);
      } else {
        company = await upsertCompany(deps.db, deps.config.tenantId, companyData as any);
      }

      // Log enrichment
      await logEnrichment(deps.db, deps.config.tenantId, 'company', company.id, enrichment.provider, enrichment as Record<string, unknown>);

      const lines: string[] = [
        `## Company Profile: ${company.name}`,
        '',
        '| Field | Value |',
        '|-------|-------|',
        `| Domain | ${company.domain ?? '-'} |`,
        `| Industry | ${company.industry ?? '-'} |`,
        `| Size | ${company.company_size ?? '-'} |`,
        `| Employees | ${company.employee_count ? formatNumber(company.employee_count) : '-'} |`,
        `| Founded | ${company.founded_year ?? '-'} |`,
        `| Funding | ${company.funding_total ? '$' + formatNumber(company.funding_total) : '-'} |`,
        `| Stage | ${company.funding_stage ?? '-'} |`,
        `| Location | ${company.location ?? '-'} |`,
        `| Website | ${company.website ?? '-'} |`,
        `| LinkedIn | ${company.linkedin_url ?? '-'} |`,
      ];

      if (company.technologies.length > 0) {
        lines.push(`| Technologies | ${company.technologies.join(', ')} |`);
      }
      if (company.description) {
        lines.push('', `**Description:** ${company.description}`);
      }

      return lines.join('\n');
    },
  };
}
