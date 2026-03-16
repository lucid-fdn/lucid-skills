// ---------------------------------------------------------------------------
// compare-contracts.ts -- Compare two contract versions for security changes
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { fullVulnerabilityScan } from '../analysis/vulnerability-detector.js';
import { computeSecurityScore } from '../analysis/security-scorer.js';
import { log } from '../utils/logger.js';

export function createCompareContractsTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_compare_contracts',
    description:
      'Compare two versions of a contract to identify security improvements or regressions.',
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
        required: false,
        description: 'Label for version A (default: "Version A")',
      },
      label_b: {
        type: 'string',
        required: false,
        description: 'Label for version B (default: "Version B")',
      },
    },
    execute: async (params: {
      source_a: string;
      source_b: string;
      label_a?: string;
      label_b?: string;
    }): Promise<string> => {
      try {
        const { source_a, source_b, label_a = 'Version A', label_b = 'Version B' } = params;

        const vulnsA = fullVulnerabilityScan(source_a);
        const vulnsB = fullVulnerabilityScan(source_b);
        const scoreA = computeSecurityScore(vulnsA);
        const scoreB = computeSecurityScore(vulnsB);

        const titlesA = new Set(vulnsA.map((v) => v.title));
        const titlesB = new Set(vulnsB.map((v) => v.title));

        const fixed = vulnsA.filter((v) => !titlesB.has(v.title));
        const introduced = vulnsB.filter((v) => !titlesA.has(v.title));
        const persistent = vulnsB.filter((v) => titlesA.has(v.title));

        const scoreDiff = scoreB - scoreA;
        const trend = scoreDiff > 0 ? 'IMPROVED' : scoreDiff < 0 ? 'REGRESSED' : 'UNCHANGED';

        const lines: string[] = [
          `## Contract Comparison: ${label_a} vs ${label_b}`,
          '',
          `| Metric | ${label_a} | ${label_b} |`,
          `|--------|-----------|-----------|`,
          `| Score | ${scoreA}/100 | ${scoreB}/100 |`,
          `| Vulnerabilities | ${vulnsA.length} | ${vulnsB.length} |`,
          '',
          `**Trend**: ${trend} (${scoreDiff >= 0 ? '+' : ''}${scoreDiff} points)`,
          '',
        ];

        if (fixed.length > 0) {
          lines.push(`### Fixed Issues (${fixed.length})`);
          for (const v of fixed) {
            lines.push(`- [${v.severity.toUpperCase()}] ${v.title}`);
          }
          lines.push('');
        }

        if (introduced.length > 0) {
          lines.push(`### New Issues (${introduced.length})`);
          for (const v of introduced) {
            lines.push(`- [${v.severity.toUpperCase()}] ${v.title}`);
          }
          lines.push('');
        }

        if (persistent.length > 0) {
          lines.push(`### Persistent Issues (${persistent.length})`);
          for (const v of persistent) {
            lines.push(`- [${v.severity.toUpperCase()}] ${v.title}`);
          }
        }

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_compare_contracts failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
