import { BaseProvider } from './base.js';
import type { ProspectProvider, EnrichmentData, CompanyEnrichmentData } from '../types/index.js';
import { logger } from '../utils/logger.js';

const PERSON_API = 'https://person.clearbit.com';
const COMPANY_API = 'https://company.clearbit.com';

interface ClearbitPersonResponse {
  id?: string;
  email?: string;
  fullName?: string;
  givenName?: string;
  familyName?: string;
  title?: string;
  bio?: string;
  linkedin?: { handle?: string };
  twitter?: { handle?: string };
  github?: { handle?: string };
  phone?: string;
  location?: string;
  employment?: {
    name?: string;
    title?: string;
    domain?: string;
    role?: string;
    seniority?: string;
  };
}

interface ClearbitCompanyResponse {
  id?: string;
  name?: string;
  domain?: string;
  category?: { industry?: string; sector?: string };
  description?: string;
  metrics?: {
    employees?: number;
    employeesRange?: string;
    raised?: number;
    annualRevenue?: string;
  };
  foundedYear?: number;
  tech?: string[];
  linkedin?: { handle?: string };
  url?: string;
  logo?: string;
  location?: string;
  legalName?: string;
  tags?: string[];
}

export class ClearbitProvider extends BaseProvider implements ProspectProvider {
  readonly name = 'clearbit';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super({ maxConcurrent: 2, minTime: 500 });
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async enrichLead(email: string): Promise<EnrichmentData> {
    logger.info(`[clearbit] Enriching person: ${email}`);

    const url = `${PERSON_API}/v2/people/find?email=${encodeURIComponent(email)}`;
    const data = await this.fetchJson<ClearbitPersonResponse>(url, {
      headers: this.authHeaders,
    });

    return {
      first_name: data.givenName,
      last_name: data.familyName,
      title: data.employment?.title ?? data.title,
      company_name: data.employment?.name,
      company_domain: data.employment?.domain,
      linkedin_url: data.linkedin?.handle ? `https://linkedin.com/in/${data.linkedin.handle}` : undefined,
      twitter_url: data.twitter?.handle ? `https://twitter.com/${data.twitter.handle}` : undefined,
      github_url: data.github?.handle ? `https://github.com/${data.github.handle}` : undefined,
      phone: data.phone,
      location: data.location,
      bio: data.bio,
      provider: 'clearbit',
    };
  }

  async enrichCompany(domain: string): Promise<CompanyEnrichmentData> {
    logger.info(`[clearbit] Enriching company: ${domain}`);

    const url = `${COMPANY_API}/v2/companies/find?domain=${encodeURIComponent(domain)}`;
    const data = await this.fetchJson<ClearbitCompanyResponse>(url, {
      headers: this.authHeaders,
    });

    return {
      name: data.name,
      domain: data.domain,
      industry: data.category?.industry,
      description: data.description,
      employee_count: data.metrics?.employees,
      founded_year: data.foundedYear,
      funding_total: data.metrics?.raised,
      technologies: data.tech,
      location: data.location,
      linkedin_url: data.linkedin?.handle ? `https://linkedin.com/company/${data.linkedin.handle}` : undefined,
      website: data.url,
      logo_url: data.logo,
      revenue_range: data.metrics?.annualRevenue,
      provider: 'clearbit',
    };
  }
}
