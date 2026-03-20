import { BaseProvider } from './base.js';
import type {
  ProspectProvider,
  LeadSearchQuery,
  LeadSearchResult,
  EnrichmentData,
  CompanyEnrichmentData,
  EmailFinderResult,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

const API_BASE = 'https://api.apollo.io';

interface ApolloPersonResult {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  linkedin_url?: string;
  phone_numbers?: Array<{ sanitized_number?: string }>;
  organization?: {
    name?: string;
    primary_domain?: string;
    industry?: string;
    estimated_num_employees?: number;
    founded_year?: number;
    total_funding?: number;
    latest_funding_stage?: string;
    linkedin_url?: string;
    website_url?: string;
  };
  city?: string;
  state?: string;
  country?: string;
  headline?: string;
  employment_history?: Array<{
    title?: string;
    organization_name?: string;
    start_date?: string;
    end_date?: string;
  }>;
}

interface ApolloSearchResponse {
  people?: ApolloPersonResult[];
  pagination?: { total_entries?: number };
}

interface ApolloMatchResponse {
  person?: ApolloPersonResult;
}

interface ApolloOrgResponse {
  organization?: {
    name?: string;
    primary_domain?: string;
    industry?: string;
    short_description?: string;
    estimated_num_employees?: number;
    founded_year?: number;
    total_funding?: number;
    latest_funding_stage?: string;
    technologies?: string[];
    linkedin_url?: string;
    website_url?: string;
    logo_url?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export class ApolloProvider extends BaseProvider implements ProspectProvider {
  readonly name = 'apollo';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super({ maxConcurrent: 2, minTime: 600 });
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async findLeads(query: LeadSearchQuery): Promise<LeadSearchResult[]> {
    logger.info(`[apollo] Searching leads: ${query.query}`);

    const body: Record<string, unknown> = {
      api_key: this.apiKey,
      q_keywords: query.query,
      per_page: query.limit ?? 25,
    };

    if (query.title) body.person_titles = [query.title];
    if (query.industry) body.organization_industry_tag_ids = [query.industry];
    if (query.location) body.person_locations = [query.location];
    if (query.companySize) {
      const sizeMap: Record<string, string[]> = {
        '1-10': ['1,10'],
        '11-50': ['11,50'],
        '51-200': ['51,200'],
        '201-500': ['201,500'],
        '501-1000': ['501,1000'],
        '1001-5000': ['1001,5000'],
        '5000+': ['5001,100000'],
      };
      body.organization_num_employees_ranges = sizeMap[query.companySize] ?? [];
    }

    const data = await this.fetchJson<ApolloSearchResponse>(`${API_BASE}/v1/mixed_people/search`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return (data.people ?? []).map((p) => ({
      email: p.email ?? null,
      first_name: p.first_name ?? null,
      last_name: p.last_name ?? null,
      title: p.title ?? null,
      company_name: p.organization?.name ?? null,
      company_domain: p.organization?.primary_domain ?? null,
      linkedin_url: p.linkedin_url ?? null,
      phone: p.phone_numbers?.[0]?.sanitized_number ?? null,
      source: 'apollo',
    }));
  }

  async enrichLead(email: string): Promise<EnrichmentData> {
    logger.info(`[apollo] Enriching lead: ${email}`);

    const data = await this.fetchJson<ApolloMatchResponse>(`${API_BASE}/v1/people/match`, {
      method: 'POST',
      body: JSON.stringify({ api_key: this.apiKey, email }),
    });

    const p = data.person;
    if (!p) {
      return { provider: 'apollo' };
    }

    const location = [p.city, p.state, p.country].filter(Boolean).join(', ');

    return {
      first_name: p.first_name,
      last_name: p.last_name,
      title: p.title,
      company_name: p.organization?.name,
      company_domain: p.organization?.primary_domain,
      linkedin_url: p.linkedin_url,
      phone: p.phone_numbers?.[0]?.sanitized_number,
      location: location || undefined,
      bio: p.headline,
      employment_history: p.employment_history?.map((e) => ({
        title: e.title ?? '',
        company: e.organization_name ?? '',
        start_date: e.start_date,
        end_date: e.end_date,
      })),
      provider: 'apollo',
    };
  }

  async enrichCompany(domain: string): Promise<CompanyEnrichmentData> {
    logger.info(`[apollo] Enriching company: ${domain}`);

    const data = await this.fetchJson<ApolloOrgResponse>(
      `${API_BASE}/v1/organizations/enrich?api_key=${this.apiKey}&domain=${encodeURIComponent(domain)}`,
    );

    const org = data.organization;
    if (!org) {
      return { provider: 'apollo' };
    }

    const location = [org.city, org.state, org.country].filter(Boolean).join(', ');

    return {
      name: org.name,
      domain: org.primary_domain,
      industry: org.industry,
      description: org.short_description,
      employee_count: org.estimated_num_employees,
      founded_year: org.founded_year,
      funding_total: org.total_funding,
      funding_stage: org.latest_funding_stage,
      technologies: org.technologies,
      location: location || undefined,
      linkedin_url: org.linkedin_url,
      website: org.website_url,
      logo_url: org.logo_url,
      provider: 'apollo',
    };
  }

  async findEmails(domain: string, name?: string): Promise<EmailFinderResult[]> {
    logger.info(`[apollo] Finding emails for domain: ${domain}`);

    const body: Record<string, unknown> = {
      api_key: this.apiKey,
      q_organization_domains: [domain],
      per_page: 25,
    };

    if (name) {
      body.q_keywords = name;
    }

    const data = await this.fetchJson<ApolloSearchResponse>(`${API_BASE}/v1/mixed_people/search`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return (data.people ?? [])
      .filter((p) => p.email)
      .map((p) => ({
        email: p.email!,
        first_name: p.first_name,
        last_name: p.last_name,
        position: p.title,
        confidence: 85,
        source: 'apollo',
      }));
  }
}
