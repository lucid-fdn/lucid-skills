// ---------------------------------------------------------------------------
// scan-contract.ts -- Scan Solidity source code for vulnerabilities
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { fullVulnerabilityScan } from '../analysis/vulnerability-detector.js';
import { buildScoreBreakdown } from '../analysis/security-scorer.js';
import { log } from '../utils/logger.js';

export function createScanContractTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_scan_contract',
    description:
      'Scan Solidity source code for vulnerabilities. Performs pattern-based detection of reentrancy, access control, overflow, unchecked returns, front-running, oracle manipulation, flash loan, logic errors, and centralization issues.',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to analyze',
      },
      contract_name: {
        type: 'string',
        required: false,
        description: 'Name of the contract (for reporting)',
      },
    },
    execute: async (params: { source_code: string; contract_name?: string }): Promise<string> => {
      try {
        const { source_code, contract_name } = params;
        log.info(`Scanning contract ${contract_name ?? 'unnamed'}`);

        const vulnerabilities = fullVulnerabilityScan(source_code);
        const score = buildScoreBreakdown(vulnerabilities);

        const lines: string[] = [
          `## Vulnerability Scan: ${contract_name ?? 'Contract'}`,
          `- **Security Score**: ${score.score}/100 (Grade: ${score.grade})`,
          `- **Total Issues**: ${vulnerabilities.length}`,
          `- **Critical**: ${score.findings.critical} | **High**: ${score.findings.high} | **Medium**: ${score.findings.medium} | **Low**: ${score.findings.low} | **Info**: ${score.findings.info}`,
          '',
        ];

        if (vulnerabilities.length > 0) {
          lines.push('### Findings');
          for (const v of vulnerabilities) {
            lines.push(`- **[${v.severity.toUpperCase()}]** ${v.title}`);
            lines.push(`  Category: ${v.category} | Location: ${v.location}`);
            lines.push(`  ${v.description}`);
            lines.push(`  Recommendation: ${v.recommendation}`);
            lines.push('');
          }
        } else {
          lines.push('No vulnerabilities detected.');
        }

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_scan_contract failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
