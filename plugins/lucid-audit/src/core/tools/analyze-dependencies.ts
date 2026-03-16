// ---------------------------------------------------------------------------
// analyze-dependencies.ts -- Check imported contracts/libraries
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { log } from '../utils/logger.js';

interface ImportInfo {
  path: string;
  isOpenZeppelin: boolean;
  isLocal: boolean;
  concern: string | null;
}

export function createAnalyzeDependenciesTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_analyze_dependencies',
    description:
      'Analyze import statements and library dependencies in Solidity source code for potential security concerns.',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to analyze',
      },
    },
    execute: async (params: { source_code: string }): Promise<string> => {
      try {
        const importPattern = /import\s+(?:\{[^}]*\}\s+from\s+)?["']([^"']+)["']/g;
        const imports: ImportInfo[] = [];
        let match: RegExpExecArray | null;

        while ((match = importPattern.exec(params.source_code)) !== null) {
          const path = match[1]!;
          const isOpenZeppelin = /openzeppelin/i.test(path);
          const isLocal = path.startsWith('./') || path.startsWith('../');
          let concern: string | null = null;

          if (!isOpenZeppelin && !isLocal) {
            concern = 'Third-party dependency -- verify the source and version.';
          }

          if (/\bproxy\b/i.test(path) && !/openzeppelin/i.test(path)) {
            concern = 'Non-standard proxy import -- verify implementation safety.';
          }

          imports.push({ path, isOpenZeppelin, isLocal, concern });
        }

        const lines: string[] = [
          `## Dependency Analysis`,
          `- **Total imports**: ${imports.length}`,
          `- **OpenZeppelin**: ${imports.filter((i) => i.isOpenZeppelin).length}`,
          `- **Local**: ${imports.filter((i) => i.isLocal).length}`,
          `- **Third-party**: ${imports.filter((i) => !i.isOpenZeppelin && !i.isLocal).length}`,
          '',
        ];

        const concerns = imports.filter((i) => i.concern);
        if (concerns.length > 0) {
          lines.push('### Concerns');
          for (const imp of concerns) {
            lines.push(`- \`${imp.path}\`: ${imp.concern}`);
          }
          lines.push('');
        }

        if (imports.length > 0) {
          lines.push('### All Imports');
          for (const imp of imports) {
            const tag = imp.isOpenZeppelin ? 'OZ' : imp.isLocal ? 'Local' : '3rd-party';
            lines.push(`- [${tag}] \`${imp.path}\``);
          }
        } else {
          lines.push('No import statements found.');
        }

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_analyze_dependencies failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
