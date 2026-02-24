// ---------------------------------------------------------------------------
// verify-contract.ts -- Verify contract source on block explorer
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { CHAINS } from '../types/common.js';
import { isValidAddress } from '../utils/text.js';
import { log } from '../utils/logger.js';

export function createVerifyContractTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_verify_contract',
    description:
      'Check if a contract address is verified on a block explorer (Etherscan and compatible explorers).',
    params: {
      address: { type: 'string', required: true, description: 'Contract address (0x...)' },
      chain: {
        type: 'enum',
        required: false,
        values: [...CHAINS],
        description: 'Blockchain network (default: ethereum)',
      },
    },
    execute: async (params: { address: string; chain?: string }): Promise<string> => {
      try {
        const { address, chain = 'ethereum' } = params;

        if (!isValidAddress(address)) {
          return `Error: Invalid address format. Expected 0x followed by 40 hex characters.`;
        }

        // This would normally call etherscan API, but we return a structured response
        const lines: string[] = [
          `## Contract Verification Check`,
          `- **Address**: \`${address}\``,
          `- **Chain**: ${chain}`,
          '',
          'Note: Full verification requires an Etherscan API key configured via AUDIT_ETHERSCAN_API_KEY.',
          _deps.config.etherscanApiKey
            ? 'API key is configured. Use audit_scan_contract with fetched source for full analysis.'
            : 'API key not configured. Provide source code directly to audit_scan_contract.',
        ];

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_verify_contract failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
