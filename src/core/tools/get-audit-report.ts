// ---------------------------------------------------------------------------
// get-audit-report.ts -- Full audit report for a contract
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { fullVulnerabilityScan } from '../analysis/vulnerability-detector.js';
import { fullGasAnalysis } from '../analysis/gas-analyzer.js';
import { buildScoreBreakdown } from '../analysis/security-scorer.js';
import { extractPragmaVersion, extractFunctionSignatures } from '../utils/text.js';
import { log } from '../utils/logger.js';

export function createGetAuditReportTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_get_audit_report',
    description:
      'Generate a comprehensive audit report including vulnerability scan, gas analysis, security score, and function analysis.',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to audit',
      },
      contract_name: {
        type: 'string',
        required: false,
        description: 'Name of the contract',
      },
    },
    execute: async (params: { source_code: string; contract_name?: string }): Promise<string> => {
      try {
        const { source_code, contract_name = 'Contract' } = params;
        log.info(`Generating full audit report for ${contract_name}`);

        const vulnerabilities = fullVulnerabilityScan(source_code);
        const gasResult = fullGasAnalysis(source_code);
        const scoreBreakdown = buildScoreBreakdown(vulnerabilities);
        const pragmaVersion = extractPragmaVersion(source_code);
        const functions = extractFunctionSignatures(source_code);

        const lines: string[] = [
          `# Audit Report: ${contract_name}`,
          '',
          `## Overview`,
          `- **Security Score**: ${scoreBreakdown.score}/100 (Grade: ${scoreBreakdown.grade})`,
          `- **Solidity Version**: ${pragmaVersion ?? 'Not specified'}`,
          `- **Functions**: ${functions.length}`,
          `- **Vulnerabilities**: ${vulnerabilities.length}`,
          `- **Gas Issues**: ${gasResult.issues.length}`,
          '',
          `## Security Findings`,
          `| Severity | Count |`,
          `|----------|-------|`,
          `| Critical | ${scoreBreakdown.findings.critical} |`,
          `| High | ${scoreBreakdown.findings.high} |`,
          `| Medium | ${scoreBreakdown.findings.medium} |`,
          `| Low | ${scoreBreakdown.findings.low} |`,
          `| Info | ${scoreBreakdown.findings.info} |`,
          '',
        ];

        if (vulnerabilities.length > 0) {
          lines.push('## Vulnerability Details');
          for (const v of vulnerabilities) {
            lines.push(`### [${v.severity.toUpperCase()}] ${v.title}`);
            lines.push(`- **Category**: ${v.category}`);
            lines.push(`- **Location**: ${v.location}`);
            lines.push(`- **Description**: ${v.description}`);
            lines.push(`- **Recommendation**: ${v.recommendation}`);
            if (v.cwe_id) lines.push(`- **CWE**: ${v.cwe_id}`);
            lines.push('');
          }
        }

        if (gasResult.issues.length > 0) {
          lines.push('## Gas Optimization');
          lines.push(`Estimated total savings: ~${gasResult.totalEstimatedSavings} gas`);
          lines.push('');
          for (const g of gasResult.issues) {
            lines.push(`- **${g.title}** (${g.location}): ${g.recommendation}`);
          }
          lines.push('');
        }

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_get_audit_report failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
