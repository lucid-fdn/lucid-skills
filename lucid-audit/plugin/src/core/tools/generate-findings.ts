// ---------------------------------------------------------------------------
// generate-findings.ts -- Generate structured findings document
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { fullVulnerabilityScan } from '../analysis/vulnerability-detector.js';
import { fullGasAnalysis } from '../analysis/gas-analyzer.js';
import { buildScoreBreakdown } from '../analysis/security-scorer.js';
import { isoNow } from '../utils/date.js';
import { log } from '../utils/logger.js';

export function createGenerateFindingsTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_generate_findings',
    description:
      'Generate a structured findings document in a standard audit report format, suitable for sharing with development teams.',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to analyze',
      },
      contract_name: {
        type: 'string',
        required: false,
        description: 'Name of the contract',
      },
      auditor: {
        type: 'string',
        required: false,
        description: 'Name of the auditor or team',
      },
    },
    execute: async (params: {
      source_code: string;
      contract_name?: string;
      auditor?: string;
    }): Promise<string> => {
      try {
        const { source_code, contract_name = 'Contract', auditor = 'Lucid Audit' } = params;

        const vulnerabilities = fullVulnerabilityScan(source_code);
        const gasResult = fullGasAnalysis(source_code);
        const score = buildScoreBreakdown(vulnerabilities);

        const lines: string[] = [
          `# Security Audit Findings`,
          '',
          `| Field | Value |`,
          `|-------|-------|`,
          `| Contract | ${contract_name} |`,
          `| Auditor | ${auditor} |`,
          `| Date | ${isoNow().split('T')[0]} |`,
          `| Score | ${score.score}/100 (${score.grade}) |`,
          '',
          `## Executive Summary`,
          '',
          score.summary,
          '',
          `## Findings`,
          '',
        ];

        if (vulnerabilities.length === 0) {
          lines.push('No security vulnerabilities were identified.');
        } else {
          let findingNum = 1;
          for (const v of vulnerabilities) {
            lines.push(`### Finding #${findingNum}: ${v.title}`);
            lines.push('');
            lines.push(`| Attribute | Value |`);
            lines.push(`|-----------|-------|`);
            lines.push(`| Severity | ${v.severity.toUpperCase()} |`);
            lines.push(`| Category | ${v.category} |`);
            lines.push(`| Location | ${v.location} |`);
            if (v.cwe_id) lines.push(`| CWE | ${v.cwe_id} |`);
            lines.push('');
            lines.push(`**Description**: ${v.description}`);
            lines.push('');
            lines.push(`**Recommendation**: ${v.recommendation}`);
            lines.push('');
            findingNum++;
          }
        }

        if (gasResult.issues.length > 0) {
          lines.push(`## Gas Optimizations`);
          lines.push('');
          lines.push(`${gasResult.issues.length} optimization(s) identified, estimated savings: ~${gasResult.totalEstimatedSavings} gas.`);
          lines.push('');
          for (const g of gasResult.issues) {
            lines.push(`- **${g.title}**: ${g.recommendation} (~${g.estimated_savings} gas)`);
          }
        }

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_generate_findings failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
