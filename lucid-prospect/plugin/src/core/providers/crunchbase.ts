import { BaseProvider } from './base.js';
import type { ProspectProvider, CompanyEnrichmentData, LeadSearchQuery, LeadSearchResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

const API_BASE = 'https://api.crunchbase.com/api/v4';

interface CrunchbaseOrgProperties {
  identifier?: { value?: string; permalink?: string };
  short_description?: string;
  name?: string;
  website?: { value?: string };
  linkedin?: { value?: string };
  num_employees_enum?: string;
  founded_on?: { value?: string };
  funding_total?: { value_usd?: number };
  last_funding_type?: string;
  categories?: Array<{ value?: string }>;
  location_identifiers?: Array<{ value?: string }>;
}

interface CrunchbaseEntityResponse {
  properties?: CrunchbaseOrgProperties;
  cards?: Record<string, unknown>;
}

interface CrunchbaseSearchResponse {
  entities?: Array<{
    properties?: CrunchbaseOrgProperties;
  }>;
  count?: number;
}

export class CrunchbaseProvider extends BaseProvider implements ProspectProvider {
  readonly name = 'crunchbase';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super({ maxConcurrent: 1, minTime: 1000 });
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private get authHeaders(): Record<string, string> {
    return {
      'X-cb-user-key': this.apiKey,
    };
  }

  private parseEmployeeCount(enumStr?: string): number | undefined {
    if (!enumStr) return undefined;
    const mapping: Record<string, number> = {
      'c_00001_00010': 5,
      'c_00011_00050': 30,
      'c_00051_00100': 75,
      'c_00101_00250': 175,
      'c_00251_00500': 375,
      'c_00501_01000': 750,
      'c_01001_05000': 3000,
      'c_05001_10000': 7500,
      'c_10001_max': 15000,
    };
    return mapping[enumStr];
  }

  async enrichCompany(domain: string): Promise<CompanyEnrichmentData> {
    logger.info(`[crunchbase] Enriching company: ${domain}`);

    const permalink = domain.replace(/\.(com|io|co|org|net)$/, '');
    const url = `${API_BASE}/entities/organizations/${encodeURIComponent(permalink)}?field_ids=short_description,name,website,linkedin,num_employees_enum,founded_on,funding_total,last_funding_type,categories,location_identifiers`;

    const data = await this.fetchJson<CrunchbaseEntityResponse>(url, {
      headers: this.authHeaders,
    });

    const props = data.properties;
    if (!props) {
      return { provider: 'crunchbase' };
    }

    const foundedYear = props.founded_on?.value ? parseInt(props.founded_on.value.split('-')[0], 10) : undefined;

    return {
      name: props.name,
      domain,
      description: props.short_description,
      employee_count: this.parseEmployeeCount(props.num_employees_enum),
      founded_year: foundedYear,
      funding_total: props.funding_total?.value_usd,
      funding_stage: props.last_funding_type,
      industry: props.categories?.[0]?.value,
      location: props.location_identifiers?.map((l) => l.value).join(', '),
      linkedin_url: props.linkedin?.value,
      website: props.website?.value,
      provider: 'crunchbase',
    };
  }

  async findLeads(query: LeadSearchQuery): Promise<LeadSearchResult[]> {
    logger.info(`[crunchbase] Searching organizations: ${query.query}`);

    const body = {
      field_ids: ['identifier', 'short_description', 'name', 'website', 'linkedin', 'categories', 'location_identifiers'],
      query: [
        {
          type: 'predicate',
          field_id: 'identifier',
          operator_id: 'contains',
          values: [query.query],
        },
      ],
      limit: query.limit ?? 25,
    };

    const data = await this.fetchJson<CrunchbaseSearchResponse>(
      `${API_BASE}/searches/organizations`,
      {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify(body),
      },
    );

    return (data.entities ?? []).map((e) => ({
      email: null,
      first_name: null,
      last_name: null,
      title: null,
      company_name: e.properties?.name ?? null,
      company_domain: e.properties?.website?.value?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? null,
      linkedin_url: e.properties?.linkedin?.value ?? null,
      phone: null,
      source: 'crunchbase',
    }));
  }
}
