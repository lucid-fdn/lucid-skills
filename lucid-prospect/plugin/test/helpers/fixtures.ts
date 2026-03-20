import type { Lead, Company, Campaign, EmailVerification, IcpProfile } from '../../src/core/types/index.js';

let counter = 0;
function nextId(): string {
  counter++;
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`;
}

export function createMockLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: nextId(),
    tenant_id: 'default',
    email: `lead${counter}@example.com`,
    first_name: 'John',
    last_name: 'Doe',
    title: 'VP of Engineering',
    company_name: 'TechCorp',
    company_domain: 'techcorp.com',
    phone: '+1-555-0100',
    linkedin_url: 'https://linkedin.com/in/johndoe',
    lead_source: 'apollo',
    status: 'new',
    score: 0,
    icp_match_score: 0,
    tags: [],
    enrichment_data: {},
    notes: null,
    campaign_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: nextId(),
    tenant_id: 'default',
    name: 'TechCorp',
    domain: 'techcorp.com',
    industry: 'technology',
    company_size: '51-200',
    description: 'A technology company',
    founded_year: 2015,
    funding_total: 10000000,
    funding_stage: 'Series A',
    employee_count: 120,
    linkedin_url: 'https://linkedin.com/company/techcorp',
    website: 'https://techcorp.com',
    technologies: ['react', 'node', 'postgres'],
    location: 'San Francisco, CA',
    enrichment_data: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: nextId(),
    tenant_id: 'default',
    name: 'Q1 Outreach',
    description: 'First quarter outreach campaign',
    status: 'draft',
    target_icp: {},
    lead_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockEmailVerification(overrides: Partial<EmailVerification> = {}): EmailVerification {
  return {
    id: nextId(),
    email: `verify${counter}@example.com`,
    status: 'valid',
    provider: 'hunter',
    mx_found: true,
    smtp_check: true,
    is_catch_all: false,
    is_disposable: false,
    verified_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockIcpProfile(overrides: Partial<IcpProfile> = {}): IcpProfile {
  return {
    industries: ['technology', 'finance'],
    company_sizes: ['51-200', '201-500'],
    titles: ['VP', 'Director', 'CTO'],
    technologies: ['react', 'node'],
    min_funding: 1000000,
    locations: ['San Francisco', 'New York'],
    ...overrides,
  };
}
