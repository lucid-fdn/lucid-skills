import type { LeadStatus, CompanySize, CampaignStatus, EmailStatus, LeadSource, Industry } from './common.js';

export interface Lead {
  id: string;
  tenant_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company_name: string | null;
  company_domain: string | null;
  phone: string | null;
  linkedin_url: string | null;
  lead_source: LeadSource;
  status: LeadStatus;
  score: number;
  icp_match_score: number;
  tags: string[];
  enrichment_data: Record<string, unknown>;
  notes: string | null;
  campaign_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  tenant_id: string;
  name: string;
  domain: string | null;
  industry: Industry | null;
  company_size: CompanySize | null;
  description: string | null;
  founded_year: number | null;
  funding_total: number;
  funding_stage: string | null;
  employee_count: number | null;
  linkedin_url: string | null;
  website: string | null;
  technologies: string[];
  location: string | null;
  enrichment_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  target_icp: Record<string, unknown>;
  lead_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailVerification {
  id: string;
  email: string;
  status: EmailStatus;
  provider: string | null;
  mx_found: boolean | null;
  smtp_check: boolean | null;
  is_catch_all: boolean;
  is_disposable: boolean;
  verified_at: string;
}

export interface EnrichmentLog {
  id: string;
  tenant_id: string;
  entity_type: 'lead' | 'company';
  entity_id: string;
  provider: string;
  data: Record<string, unknown>;
  created_at: string;
}
