import type { ToolDefinition } from './types.js';
import type { PluginConfig, ProviderRegistry } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createFindLeadsTool } from './find-leads.js';
import { createEnrichLeadTool } from './enrich-lead.js';
import { createEnrichCompanyTool } from './enrich-company.js';
import { createFindEmailsTool } from './find-emails.js';
import { createVerifyEmailTool } from './verify-email.js';
import { createBuildListTool } from './build-list.js';
import { createScoreLeadsTool } from './score-leads.js';
import { createFindCompaniesTool } from './find-companies.js';
import { createGetIcpMatchTool } from './get-icp-match.js';
import { createExportLeadsTool } from './export-leads.js';
import { createManageCampaignTool } from './manage-campaign.js';
import { createGetInsightsTool } from './get-insights.js';
import { createSearchProspectsTool } from './search-prospects.js';
import { createGetLeadResearchTool } from './get-lead-research.js';
import { createStatusTool } from './status.js';

export { type ToolDefinition, type ToolParamDef, type ParamType } from './types.js';

export interface ToolDeps {
  config: PluginConfig;
  db: SupabaseClient;
  registry: ProviderRegistry;
}

export function createAllTools(deps: ToolDeps): ToolDefinition[] {
  return [
    createFindLeadsTool(deps),
    createEnrichLeadTool(deps),
    createEnrichCompanyTool(deps),
    createFindEmailsTool(deps),
    createVerifyEmailTool(deps),
    createBuildListTool(deps),
    createScoreLeadsTool(deps),
    createFindCompaniesTool(deps),
    createGetIcpMatchTool(deps),
    createExportLeadsTool(deps),
    createManageCampaignTool(deps),
    createGetInsightsTool(deps),
    createSearchProspectsTool(deps),
    createGetLeadResearchTool(deps),
    createStatusTool(deps),
  ];
}

export {
  createFindLeadsTool,
  createEnrichLeadTool,
  createEnrichCompanyTool,
  createFindEmailsTool,
  createVerifyEmailTool,
  createBuildListTool,
  createScoreLeadsTool,
  createFindCompaniesTool,
  createGetIcpMatchTool,
  createExportLeadsTool,
  createManageCampaignTool,
  createGetInsightsTool,
  createSearchProspectsTool,
  createGetLeadResearchTool,
  createStatusTool,
};
