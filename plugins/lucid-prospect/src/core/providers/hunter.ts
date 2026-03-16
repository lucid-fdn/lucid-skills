import { BaseProvider } from './base.js';
import type {
  ProspectProvider,
  EmailFinderResult,
  EmailVerificationResult,
  EnrichmentData,
  EmailStatus,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

const API_BASE = 'https://api.hunter.io';

interface HunterDomainSearchResponse {
  data?: {
    domain?: string;
    emails?: Array<{
      value?: string;
      type?: string;
      confidence?: number;
      first_name?: string;
      last_name?: string;
      position?: string;
      department?: string;
      linkedin?: string;
      phone_number?: string;
    }>;
    organization?: string;
  };
}

interface HunterVerifyResponse {
  data?: {
    email?: string;
    result?: string; // 'deliverable' | 'undeliverable' | 'risky' | 'unknown'
    score?: number;
    mx_records?: boolean;
    smtp_server?: boolean;
    smtp_check?: boolean;
    accept_all?: boolean;
    disposable?: boolean;
  };
}

interface HunterFinderResponse {
  data?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    position?: string;
    linkedin_url?: string;
    phone_number?: string;
    company?: string;
    score?: number;
  };
}

export class HunterProvider extends BaseProvider implements ProspectProvider {
  readonly name = 'hunter';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super({ maxConcurrent: 2, minTime: 1000 });
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async findEmails(domain: string, name?: string): Promise<EmailFinderResult[]> {
    logger.info(`[hunter] Searching emails for domain: ${domain}`);

    let url = `${API_BASE}/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${this.apiKey}`;
    if (name) {
      url += `&type=personal`;
    }

    const data = await this.fetchJson<HunterDomainSearchResponse>(url);

    return (data.data?.emails ?? []).map((e) => ({
      email: e.value ?? '',
      first_name: e.first_name,
      last_name: e.last_name,
      position: e.position,
      confidence: e.confidence ?? 0,
      source: 'hunter',
    }));
  }

  async verifyEmail(email: string): Promise<EmailVerificationResult> {
    logger.info(`[hunter] Verifying email: ${email}`);

    const url = `${API_BASE}/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${this.apiKey}`;
    const data = await this.fetchJson<HunterVerifyResponse>(url);

    const resultMap: Record<string, EmailStatus> = {
      deliverable: 'valid',
      undeliverable: 'invalid',
      risky: 'catch_all',
      unknown: 'unknown',
    };

    const result = data.data;
    return {
      email,
      status: resultMap[result?.result ?? 'unknown'] ?? 'unknown',
      mx_found: result?.mx_records ?? false,
      smtp_check: result?.smtp_check ?? false,
      is_catch_all: result?.accept_all ?? false,
      is_disposable: result?.disposable ?? false,
      provider: 'hunter',
    };
  }

  async enrichLead(email: string): Promise<EnrichmentData> {
    logger.info(`[hunter] Enriching lead via email finder: ${email}`);

    const parts = email.split('@');
    const domain = parts[1];

    // Hunter email-finder by domain + first/last name guess from email
    const localPart = parts[0];
    const nameParts = localPart.split(/[._-]/);

    let url = `${API_BASE}/v2/email-finder?domain=${encodeURIComponent(domain)}&api_key=${this.apiKey}`;
    if (nameParts.length >= 2) {
      url += `&first_name=${encodeURIComponent(nameParts[0])}&last_name=${encodeURIComponent(nameParts[nameParts.length - 1])}`;
    }

    const data = await this.fetchJson<HunterFinderResponse>(url);
    const result = data.data;

    return {
      first_name: result?.first_name,
      last_name: result?.last_name,
      title: result?.position,
      company_name: result?.company,
      company_domain: domain,
      linkedin_url: result?.linkedin_url,
      phone: result?.phone_number,
      provider: 'hunter',
    };
  }
}
