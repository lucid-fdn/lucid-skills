export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export const LEAD_SOURCES = [
  'linkedin',
  'apollo',
  'hunter',
  'clearbit',
  'crunchbase',
  'manual',
  'import',
  'referral',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const INDUSTRIES = [
  'technology',
  'finance',
  'healthcare',
  'education',
  'retail',
  'manufacturing',
  'media',
  'real_estate',
  'consulting',
  'other',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const EMAIL_STATUSES = ['valid', 'invalid', 'catch_all', 'unknown', 'disposable'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
