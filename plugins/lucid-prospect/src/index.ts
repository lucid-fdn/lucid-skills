export { default } from './openclaw.js';
export { createProspectServer } from './mcp.js';
export {
  PLUGIN_ID,
  PLUGIN_NAME,
  PLUGIN_VERSION,
  loadConfig,
  createAllTools,
  createProviderRegistry,
  scoreLead,
  matchLeadToIcp,
  matchCompanyToIcp,
  buildIcpFromLeads,
  buildLeadResearchPrompt,
  ProspectScheduler,
} from './core/index.js';
export type {
  PluginConfig,
  Lead,
  Company,
  Campaign,
  LeadStatus,
  CompanySize,
  Industry,
  EmailStatus,
  CampaignStatus,
  IcpProfile,
  LeadScoreBreakdown,
  ToolDefinition,
} from './core/index.js';
