// ---------------------------------------------------------------------------
// get-security-score.ts -- Security score (0-100) with breakdown
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { fullVulnerabilityScan } from '../analysis/vulnerability-detector.js';
import { buildScoreBreakdown } from '../analysis/security-scorer.js';
import { formatScoreBar } from '../utils/text.js';
import { log } from '../utils/logger.js';

export function createGetSecurityScoreTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_get_security_score',
    description:
      'Calculate a security score (0-100) for Solidity source code with detailed breakdown by severity.',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to score',
      },
    },
    execute: async (params: { source_code: string }): Promise<string> => {
      try {
        const vulnerabilities = fullVulnerabilityScan(params.source_code);
        const breakdown = buildScoreBreakdown(vulnerabilities);

        const lines: string[] = [
          `## Security Score`,
          formatScoreBar(breakdown.score),
          `**Grade**: ${breakdown.grade}`,
          '',
          '### Breakdown',
        ];

        for (const d of breakdown.deductions) {
          lines.push(
            `- ${d.severity.toUpperCase()}: ${d.count} issue(s), -${d.points} points`,
          );
        }

        if (breakdown.deductions.length === 0) {
          lines.push('- No deductions. Clean contract!');
        }

        lines.push('');
        lines.push(breakdown.summary);

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_get_security_score failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
