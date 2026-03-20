export { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION } from './plugin-id.js';
export { loadConfig, CONFIG_DEFAULTS, ConfigSchema, type ConfigSchemaType } from './config/index.js';
export { getClient, resetClient } from './db/client.js';
export { createAllTools, type ToolDeps, type ToolDefinition, type ToolParamDef, type ParamType } from './tools/index.js';
export { createProviderRegistry } from './providers/index.js';
export { scoreLead } from './analysis/lead-scorer.js';
export { matchLeadToIcp, matchCompanyToIcp, buildIcpFromLeads } from './analysis/icp-matcher.js';
export { buildLeadResearchPrompt, LEAD_RESEARCH_SYSTEM_PROMPT, COMPANY_ANALYSIS_PROMPT } from './analysis/prompts.js';
export { ProspectScheduler } from './services/index.js';

export type {
  PluginConfig,
  Lead,
  Company,
  Campaign,
  EmailVerification,
  EnrichmentLog,
  LeadStatus,
  CompanySize,
  LeadSource,
  Industry,
  EmailStatus,
  CampaignStatus,
  LeadSearchQuery,
  LeadSearchResult,
  EnrichmentData,
  CompanyEnrichmentData,
  EmailFinderResult,
  EmailVerificationResult,
  ProspectProvider,
  ProviderRegistry,
  IcpProfile,
  LeadScoreBreakdown,
  SearchInsight,
} from './types/index.js';
