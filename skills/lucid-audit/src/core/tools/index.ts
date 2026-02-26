// ---------------------------------------------------------------------------
// index.ts -- Create all Audit tools
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { PluginConfig } from '../types/index.js';
import { createScanContractTool } from './scan-contract.js';
import { createGetSecurityScoreTool } from './get-security-score.js';
import { createCheckReentrancyTool } from './check-reentrancy.js';
import { createCheckAccessControlTool } from './check-access-control.js';
import { createAnalyzeGasTool } from './analyze-gas.js';
import { createVerifyContractTool } from './verify-contract.js';
import { createGetAuditReportTool } from './get-audit-report.js';
import { createListAuditsTool } from './list-audits.js';
import { createCompareContractsTool } from './compare-contracts.js';
import { createCheckUpgradabilityTool } from './check-upgradability.js';
import { createGetKnownVulnerabilitiesTool } from './get-known-vulnerabilities.js';
import { createAnalyzeDependenciesTool } from './analyze-dependencies.js';
import { createGenerateFindingsTool } from './generate-findings.js';
import { createStatusTool } from './status.js';
import { createBrainTools } from '../../brain/index.js';

export interface ToolDependencies {
  config: PluginConfig;
}

export function createAllTools(deps: ToolDependencies): ToolDefinition[] {
  return [
    // Core tools (14)
    createScanContractTool(deps),
    createGetSecurityScoreTool(deps),
    createCheckReentrancyTool(deps),
    createCheckAccessControlTool(deps),
    createAnalyzeGasTool(deps),
    createVerifyContractTool(deps),
    createGetAuditReportTool(deps),
    createListAuditsTool(deps),
    createCompareContractsTool(deps),
    createCheckUpgradabilityTool(deps),
    createGetKnownVulnerabilitiesTool(deps),
    createAnalyzeDependenciesTool(deps),
    createGenerateFindingsTool(deps),
    createStatusTool(deps),
    // Brain tools (5)
    ...createBrainTools({ config: deps.config }),
  ];
}

export type { ToolDefinition, ToolParamDef } from './types.js';
