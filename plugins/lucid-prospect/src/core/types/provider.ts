import type { Industry, CompanySize, EmailStatus } from './common.js';

export interface LeadSearchQuery {
  query: string;
  title?: string;
  industry?: Industry;
  companySize?: CompanySize;
  location?: string;
  limit?: number;
}

export interface LeadSearchResult {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company_name: string | null;
  company_domain: string | null;
  linkedin_url: string | null;
  phone: string | null;
  source: string;
}

export interface EnrichmentData {
  [key: string]: unknown;
  first_name?: string;
  last_name?: string;
  title?: string;
  company_name?: string;
  company_domain?: string;
  linkedin_url?: string;
  phone?: string;
  location?: string;
  bio?: string;
  twitter_url?: string;
  github_url?: string;
  employment_history?: Array<{ title: string; company: string; start_date?: string; end_date?: string }>;
  skills?: string[];
  provider: string;
}

export interface CompanyEnrichmentData {
  [key: string]: unknown;
  name?: string;
  domain?: string;
  industry?: string;
  description?: string;
  employee_count?: number;
  founded_year?: number;
  funding_total?: number;
  funding_stage?: string;
  technologies?: string[];
  location?: string;
  linkedin_url?: string;
  website?: string;
  logo_url?: string;
  revenue_range?: string;
  provider: string;
}

export interface EmailFinderResult {
  email: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  confidence: number;
  source: string;
}

export interface EmailVerificationResult {
  email: string;
  status: EmailStatus;
  mx_found: boolean;
  smtp_check: boolean;
  is_catch_all: boolean;
  is_disposable: boolean;
  provider: string;
}

export interface ProspectProvider {
  name: string;
  isConfigured(): boolean;
  findLeads?(query: LeadSearchQuery): Promise<LeadSearchResult[]>;
  enrichLead?(email: string): Promise<EnrichmentData>;
  enrichCompany?(domain: string): Promise<CompanyEnrichmentData>;
  findEmails?(domain: string, name?: string): Promise<EmailFinderResult[]>;
  verifyEmail?(email: string): Promise<EmailVerificationResult>;
}

export interface ProviderRegistry {
  providers: ProspectProvider[];
  getConfigured(): ProspectProvider[];
  findLeads(query: LeadSearchQuery): Promise<LeadSearchResult[]>;
  enrichLead(email: string): Promise<EnrichmentData>;
  enrichCompany(domain: string): Promise<CompanyEnrichmentData>;
  findEmails(domain: string, name?: string): Promise<EmailFinderResult[]>;
  verifyEmail(email: string): Promise<EmailVerificationResult>;
}
