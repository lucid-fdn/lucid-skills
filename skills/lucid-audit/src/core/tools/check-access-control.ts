// ---------------------------------------------------------------------------
// check-access-control.ts -- Access control pattern analysis
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { detectAccessControl } from '../analysis/vulnerability-detector.js';
import { log } from '../utils/logger.js';

export function createCheckAccessControlTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_check_access_control',
    description:
      'Analyze Solidity source code for access control issues: unprotected selfdestruct, missing access control on sensitive functions, tx.origin misuse.',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to check',
      },
    },
    execute: async (params: { source_code: string }): Promise<string> => {
      try {
        const findings = detectAccessControl(params.source_code);

        if (findings.length === 0) {
          return '## Access Control Check: PASS\n\nNo access control issues detected.';
        }

        const lines: string[] = [
          `## Access Control Check: ${findings.some((f) => f.severity === 'critical') ? 'CRITICAL' : 'WARNING'}`,
          `Found ${findings.length} access control issue(s):`,
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
        log.error('audit_check_access_control failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
