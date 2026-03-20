// ---------------------------------------------------------------------------
// get-known-vulnerabilities.ts -- Check against known vulnerability patterns
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { log } from '../utils/logger.js';

interface KnownVuln {
  id: string;
  name: string;
  pattern: RegExp;
  severity: string;
  description: string;
  affected: string;
}

const KNOWN_VULNS: KnownVuln[] = [
  {
    id: 'SWC-107',
    name: 'Reentrancy',
    pattern: /\.call\{.*value/,
    severity: 'critical',
    description: 'Functions that send ETH and have state changes after the call.',
    affected: 'All Solidity versions',
  },
  {
    id: 'SWC-101',
    name: 'Integer Overflow and Underflow',
    pattern: /pragma\s+solidity\s+\^?0\.[0-7]\./,
    severity: 'high',
    description: 'Arithmetic operations on Solidity < 0.8.0 without SafeMath.',
    affected: 'Solidity < 0.8.0',
  },
  {
    id: 'SWC-106',
    name: 'Unprotected SELFDESTRUCT',
    pattern: /selfdestruct\s*\(/,
    severity: 'critical',
    description: 'Self-destruct callable without access control.',
    affected: 'All Solidity versions',
  },
  {
    id: 'SWC-115',
    name: 'Authorization through tx.origin',
    pattern: /tx\.origin/,
    severity: 'medium',
    description: 'Using tx.origin for authorization allows phishing.',
    affected: 'All Solidity versions',
  },
  {
    id: 'SWC-112',
    name: 'Delegatecall to Untrusted Callee',
    pattern: /delegatecall/,
    severity: 'high',
    description: 'Delegatecall to user-controlled address.',
    affected: 'All Solidity versions',
  },
  {
    id: 'SWC-104',
    name: 'Unchecked Call Return Value',
    pattern: /\.call\s*\{[^}]*\}\s*\([^)]*\)\s*;/,
    severity: 'high',
    description: 'Low-level call without checking return value.',
    affected: 'All Solidity versions',
  },
  {
    id: 'SWC-120',
    name: 'Weak Sources of Randomness',
    pattern: /block\.(timestamp|difficulty|number)\s*[%*]/,
    severity: 'medium',
    description: 'Using block properties for randomness.',
    affected: 'All Solidity versions',
  },
  {
    id: 'SWC-131',
    name: 'Presence of Unused Variables',
    pattern: /\/\/\s*unused|_unused/,
    severity: 'info',
    description: 'Unused variables increase deployment cost.',
    affected: 'All Solidity versions',
  },
];

export function createGetKnownVulnerabilitiesTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_get_known_vulnerabilities',
    description:
      'Check contract source code against a database of known vulnerability patterns (SWC registry).',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to check',
      },
    },
    execute: async (params: { source_code: string }): Promise<string> => {
      try {
        const matches = KNOWN_VULNS.filter((v) => v.pattern.test(params.source_code));

        const lines: string[] = [
          `## Known Vulnerability Check`,
          `Checked against ${KNOWN_VULNS.length} known patterns.`,
          `**Matches**: ${matches.length}`,
          '',
        ];

        if (matches.length > 0) {
          for (const m of matches) {
            lines.push(`### [${m.severity.toUpperCase()}] ${m.id}: ${m.name}`);
            lines.push(`- ${m.description}`);
            lines.push(`- Affected: ${m.affected}`);
            lines.push('');
          }
        } else {
          lines.push('No matches against known vulnerability patterns.');
        }

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_get_known_vulnerabilities failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
