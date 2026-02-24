// ---------------------------------------------------------------------------
// check-reentrancy.ts -- Specific reentrancy vulnerability check
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { detectReentrancy } from '../analysis/vulnerability-detector.js';
import { log } from '../utils/logger.js';

export function createCheckReentrancyTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_check_reentrancy',
    description:
      'Check Solidity source code specifically for reentrancy vulnerabilities including cross-function reentrancy.',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to check',
      },
    },
    execute: async (params: { source_code: string }): Promise<string> => {
      try {
        const findings = detectReentrancy(params.source_code);

        if (findings.length === 0) {
          return '## Reentrancy Check: PASS\n\nNo reentrancy vulnerabilities detected.';
        }

        const lines: string[] = [
          `## Reentrancy Check: ${findings.some((f) => f.severity === 'critical') ? 'CRITICAL' : 'WARNING'}`,
          `Found ${findings.length} reentrancy issue(s):`,
          '',
        ];

        for (const f of findings) {
          lines.push(`### [${f.severity.toUpperCase()}] ${f.title}`);
          lines.push(`- Location: ${f.location}`);
          lines.push(`- ${f.description}`);
          lines.push(`- Recommendation: ${f.recommendation}`);
          lines.push('');
        }

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_check_reentrancy failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
