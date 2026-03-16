export {
  LEAD_STATUSES,
  COMPANY_SIZES,
  LEAD_SOURCES,
  INDUSTRIES,
  EMAIL_STATUSES,
  CAMPAIGN_STATUSES,
  type LeadStatus,
  type CompanySize,
  type LeadSource,
  type Industry,
  type EmailStatus,
  type CampaignStatus,
} from './common.js';

export { type PluginConfig } from './config.js';

export {
  type Lead,
  type Company,
  type Campaign,
  type EmailVerification,
  type EnrichmentLog,
} from './database.js';

export {
  type LeadSearchQuery,
  type LeadSearchResult,
  type EnrichmentData,
  type CompanyEnrichmentData,
  type EmailFinderResult,
  type EmailVerificationResult,
  type ProspectProvider,
  type ProviderRegistry,
} from './provider.js';

export { type IcpProfile, type LeadScoreBreakdown, type SearchInsight } from './analysis.js';
