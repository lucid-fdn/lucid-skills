// ---------------------------------------------------------------------------
// brain/tools.ts -- 5 brain MCP tools for Lucid Audit
// ---------------------------------------------------------------------------

import type { ToolDefinition } from '../core/tools/types.js';
import type { PluginConfig } from '../core/types/index.js';
import { runAudit, runCompare, runBatchScan, runGasAnalysis } from './analysis.js';
import {
  formatAuditResult,
  formatCompareResult,
  formatBatchResult,
  formatGasResult,
} from './formatter.js';
import { log } from '../core/utils/logger.js';

// Individual detectors for lucid_audit_pro
import {
  detectReentrancy,
  detectAccessControl,
  detectOverflow,
  detectUncheckedReturn,
  detectFrontRunning,
  detectOracleManipulation,
  detectFlashLoan,
  detectLogicErrors,
  detectCentralization,
  fullVulnerabilityScan,
} from '../core/analysis/vulnerability-detector.js';
import {
  detectStorageInLoops,
  detectUnnecessarySloads,
  detectPackingIssues,
  detectLoopOptimizations,
  detectVisibilityOptimizations,
  detectMiscGasIssues,
  fullGasAnalysis,
} from '../core/analysis/gas-analyzer.js';
import {
  computeSecurityScore,
  scoreToGrade,
  buildScoreBreakdown,
} from '../core/analysis/security-scorer.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface BrainDeps {
  config: PluginConfig;
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createBrainTools(_deps: BrainDeps): ToolDefinition[] {
  // -----------------------------------------------------------------------
  // 1. lucid_audit -- Deep audit of a single contract
  // -----------------------------------------------------------------------
  const lucidAudit: ToolDefinition = {
    name: 'lucid_audit',
    description:
      'Deep security audit of a Solidity contract. Runs all 9 vulnerability detectors + 6 gas analyzers and returns a structured AuditResult with verdict (SAFE / CAUTION / RISKY / CRITICAL), score (0-100), grade (A-F), top vulnerabilities, gas analysis, and risk factors.',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to audit',
      },
      contract_name: {
        type: 'string',
        description: 'Name of the contract (for reporting)',
      },
      chain: {
        type: 'string',
        description: 'Chain the contract is deployed on (ethereum, bsc, polygon, etc.)',
      },
      address: {
        type: 'string',
        description: 'Deployed contract address (for reporting)',
      },
      format: {
        type: 'enum',
        values: ['json', 'text'],
        default: 'json',
        description: 'Output format: json (structured) or text (human-readable)',
      },
      detail: {
        type: 'enum',
        values: ['full', 'compact'],
        default: 'full',
        description: 'Detail level: full includes all vulnerabilities and gas details, compact omits them',
      },
    },
    execute: async (params: Record<string, unknown>): Promise<string> => {
      try {
        const sourceCode = params.source_code as string;
        const contractName = params.contract_name as string | undefined;
        const chain = params.chain as string | undefined;
        const address = params.address as string | undefined;
        const format = (params.format as string) ?? 'json';
        const detail = ((params.detail as string) ?? 'full') as 'full' | 'compact';

        log.info(`lucid_audit: auditing ${contractName ?? 'unnamed'}`);

        const result = runAudit({ sourceCode, contractName, chain, address });

        if (format === 'text') return formatAuditResult(result, detail);
        if (detail === 'compact') {
          const { topVulnerabilities: _tv, gasAnalysis: _ga, ...compact } = result;
          return JSON.stringify(compact);
        }
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('lucid_audit failed', err);
        return JSON.stringify({ error: msg });
      }
    },
  };

  // -----------------------------------------------------------------------
  // 2. lucid_audit_compare -- Compare two contract versions
  // -----------------------------------------------------------------------
  const lucidAuditCompare: ToolDefinition = {
    name: 'lucid_audit_compare',
    description:
      'Compare two contract versions to identify fixed, new, and persistent security issues. Shows score delta and overall trend (IMPROVED / REGRESSED / UNCHANGED).',
    params: {
      source_a: {
        type: 'string',
        required: true,
        description: 'Source code of the first (older) version',
      },
      source_b: {
        type: 'string',
        required: true,
        description: 'Source code of the second (newer) version',
      },
      label_a: {
        type: 'string',
        description: 'Label for version A (default: "Version A")',
      },
      label_b: {
        type: 'string',
        description: 'Label for version B (default: "Version B")',
      },
      format: {
        type: 'enum',
        values: ['json', 'text'],
        default: 'json',
        description: 'Output format',
      },
    },
    execute: async (params: Record<string, unknown>): Promise<string> => {
      try {
        const sourceA = params.source_a as string;
        const sourceB = params.source_b as string;
        const labelA = params.label_a as string | undefined;
        const labelB = params.label_b as string | undefined;
        const format = (params.format as string) ?? 'json';

        log.info(`lucid_audit_compare: comparing ${labelA ?? 'A'} vs ${labelB ?? 'B'}`);

        const result = runCompare({ sourceA, sourceB, labelA, labelB });

        if (format === 'text') return formatCompareResult(result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('lucid_audit_compare failed', err);
        return JSON.stringify({ error: msg });
      }
    },
  };

  // -----------------------------------------------------------------------
  // 3. lucid_audit_batch -- Scan multiple contracts
  // -----------------------------------------------------------------------
  const lucidAuditBatch: ToolDefinition = {
    name: 'lucid_audit_batch',
    description:
      'Batch scan multiple contracts and return aggregate scores, verdicts, and finding counts. Identifies the worst contract in the set.',
    params: {
      contracts: {
        type: 'array',
        required: true,
        description: 'Array of {source, name} objects representing contracts to scan',
        items: {
          type: 'object',
          properties: {
            source: { type: 'string', required: true, description: 'Solidity source code' },
            name: { type: 'string', required: true, description: 'Contract name' },
          },
        },
      },
      format: {
        type: 'enum',
        values: ['json', 'text'],
        default: 'json',
        description: 'Output format',
      },
    },
    execute: async (params: Record<string, unknown>): Promise<string> => {
      try {
        const contracts = params.contracts as Array<{ source: string; name: string }>;
        const format = (params.format as string) ?? 'json';

        if (!Array.isArray(contracts) || contracts.length === 0) {
          return JSON.stringify({ error: 'contracts array is required and must not be empty' });
        }

        log.info(`lucid_audit_batch: scanning ${contracts.length} contracts`);

        const result = runBatchScan(contracts);

        if (format === 'text') return formatBatchResult(result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('lucid_audit_batch failed', err);
        return JSON.stringify({ error: msg });
      }
    },
  };

  // -----------------------------------------------------------------------
  // 4. lucid_gas -- Focused gas optimization analysis
  // -----------------------------------------------------------------------
  const lucidGas: ToolDefinition = {
    name: 'lucid_gas',
    description:
      'Focused gas optimization analysis of Solidity source code. Detects storage inefficiencies, loop issues, packing problems, visibility improvements, and more. Returns structured results with estimated savings per issue.',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to analyze',
      },
      format: {
        type: 'enum',
        values: ['json', 'text'],
        default: 'json',
        description: 'Output format',
      },
    },
    execute: async (params: Record<string, unknown>): Promise<string> => {
      try {
        const sourceCode = params.source_code as string;
        const format = (params.format as string) ?? 'json';

        log.info('lucid_gas: analyzing gas optimization');

        const result = runGasAnalysis({ sourceCode });

        if (format === 'text') return formatGasResult(result);
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('lucid_gas failed', err);
        return JSON.stringify({ error: msg });
      }
    },
  };

  // -----------------------------------------------------------------------
  // 5. lucid_audit_pro -- Direct access to individual detectors
  // -----------------------------------------------------------------------
  const lucidAuditPro: ToolDefinition = {
    name: 'lucid_audit_pro',
    description:
      'Direct access to individual vulnerability detectors and gas analyzers. Use list_tools to see available tools, or call one directly with source_code in params.',
    params: {
      tool: {
        type: 'string',
        required: true,
        description: 'Tool name or "list_tools" to see available tools',
      },
      params: {
        type: 'object',
        description: 'Tool parameters — typically {source_code: "..."}',
      },
    },
    execute: async (params: Record<string, unknown>): Promise<string> => {
      const toolName = params.tool as string;
      const toolParams = (params.params as Record<string, unknown>) ?? {};

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const proTools: Record<string, (p: any) => unknown> = {
        // Vulnerability detectors
        detect_reentrancy: (p) => detectReentrancy(p.source_code),
        detect_access_control: (p) => detectAccessControl(p.source_code),
        detect_overflow: (p) => detectOverflow(p.source_code),
        detect_unchecked_return: (p) => detectUncheckedReturn(p.source_code),
        detect_front_running: (p) => detectFrontRunning(p.source_code),
        detect_oracle_manipulation: (p) => detectOracleManipulation(p.source_code),
        detect_flash_loan: (p) => detectFlashLoan(p.source_code),
        detect_logic_errors: (p) => detectLogicErrors(p.source_code),
        detect_centralization: (p) => detectCentralization(p.source_code),
        full_vulnerability_scan: (p) => fullVulnerabilityScan(p.source_code),

        // Gas analyzers
        detect_storage_in_loops: (p) => detectStorageInLoops(p.source_code),
        detect_unnecessary_sloads: (p) => detectUnnecessarySloads(p.source_code),
        detect_packing_issues: (p) => detectPackingIssues(p.source_code),
        detect_loop_optimizations: (p) => detectLoopOptimizations(p.source_code),
        detect_visibility_optimizations: (p) => detectVisibilityOptimizations(p.source_code),
        detect_misc_gas_issues: (p) => detectMiscGasIssues(p.source_code),
        full_gas_analysis: (p) => fullGasAnalysis(p.source_code),

        // Scoring
        compute_security_score: (p) => {
          const vulns = fullVulnerabilityScan(p.source_code);
          return computeSecurityScore(vulns);
        },
        score_to_grade: (p) => scoreToGrade(p.score),
        build_score_breakdown: (p) => {
          const vulns = fullVulnerabilityScan(p.source_code);
          return buildScoreBreakdown(vulns);
        },
      };
      /* eslint-enable @typescript-eslint/no-explicit-any */

      if (toolName === 'list_tools') {
        const tools = Object.keys(proTools).map((name) => {
          let type: string;
          if (name.startsWith('detect_') && !name.includes('storage') && !name.includes('sload') && !name.includes('packing') && !name.includes('loop') && !name.includes('visibility') && !name.includes('misc_gas')) {
            type = 'vulnerability_detector';
          } else if (name.startsWith('full_vulnerability') || name.startsWith('compute_') || name.startsWith('score_') || name.startsWith('build_')) {
            type = 'scoring';
          } else {
            type = 'gas_analyzer';
          }
          return { name, type };
        });
        return JSON.stringify({ tools });
      }

      const fn = proTools[toolName];
      if (!fn) {
        return JSON.stringify({
          error: `Tool "${toolName}" not found. Use list_tools to see available tools.`,
        });
      }

      try {
        const result = fn(toolParams);
        return JSON.stringify(result);
      } catch (err) {
        return JSON.stringify({
          error: `Tool "${toolName}" failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    },
  };

  return [lucidAudit, lucidAuditCompare, lucidAuditBatch, lucidGas, lucidAuditPro];
}
