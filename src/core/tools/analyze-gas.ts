// ---------------------------------------------------------------------------
// analyze-gas.ts -- Gas optimization analysis and recommendations
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { fullGasAnalysis } from '../analysis/gas-analyzer.js';
import { log } from '../utils/logger.js';

export function createAnalyzeGasTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_analyze_gas',
    description:
      'Analyze Solidity source code for gas optimization opportunities including storage patterns, loop optimization, packing, and visibility improvements.',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to analyze',
      },
    },
    execute: async (params: { source_code: string }): Promise<string> => {
      try {
        const result = fullGasAnalysis(params.source_code);

        const lines: string[] = [
          `## Gas Optimization Analysis`,
          `- **Issues Found**: ${result.issues.length}`,
          `- **Estimated Total Savings**: ~${result.totalEstimatedSavings} gas`,
          '',
        ];

        if (result.issues.length > 0) {
          // Group by category
          const byCategory = new Map<string, typeof result.issues>();
          for (const issue of result.issues) {
            const existing = byCategory.get(issue.category) ?? [];
            existing.push(issue);
            byCategory.set(issue.category, existing);
          }

          for (const [category, issues] of byCategory) {
            lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
            for (const issue of issues) {
              lines.push(`- **${issue.title}** (${issue.location})`);
              lines.push(`  ${issue.description}`);
              lines.push(`  Savings: ~${issue.estimated_savings} gas`);
              lines.push(`  Fix: ${issue.recommendation}`);
              lines.push('');
            }
          }
        } else {
          lines.push('No gas optimization issues found. Well done!');
        }

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_analyze_gas failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
