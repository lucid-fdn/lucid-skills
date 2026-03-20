// ---------------------------------------------------------------------------
// check-upgradability.ts -- Proxy/upgradability pattern analysis
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { log } from '../utils/logger.js';

export function createCheckUpgradabilityTool(_deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_check_upgradability',
    description:
      'Analyze Solidity source code for proxy and upgradability patterns including transparent proxy, UUPS, and beacon patterns.',
    params: {
      source_code: {
        type: 'string',
        required: true,
        description: 'Solidity source code to analyze',
      },
    },
    execute: async (params: { source_code: string }): Promise<string> => {
      try {
        const { source_code } = params;
        const findings: string[] = [];
        let proxyType = 'None detected';

        // Detect proxy patterns
        if (/TransparentUpgradeableProxy|TransparentProxy/i.test(source_code)) {
          proxyType = 'Transparent Proxy';
          findings.push('Transparent Proxy pattern detected. Admin and implementation are separated.');
        }

        if (/UUPSUpgradeable|_authorizeUpgrade/i.test(source_code)) {
          proxyType = 'UUPS Proxy';
          findings.push('UUPS Proxy pattern detected. Upgrade logic is in the implementation.');

          if (!/onlyOwner|onlyRole|_checkRole/.test(source_code)) {
            findings.push(
              'WARNING: _authorizeUpgrade may lack access control. Ensure only authorized addresses can upgrade.',
            );
          }
        }

        if (/BeaconProxy|UpgradeableBeacon/i.test(source_code)) {
          proxyType = 'Beacon Proxy';
          findings.push('Beacon Proxy pattern detected. Multiple proxies share one beacon.');
        }

        if (/delegatecall/i.test(source_code) && proxyType === 'None detected') {
          proxyType = 'Custom Proxy (delegatecall)';
          findings.push(
            'Custom proxy using delegatecall detected. Verify storage layout compatibility.',
          );
        }

        // Check for initializer patterns
        const hasInitializer = /initializer|initialize\s*\(/i.test(source_code);
        const hasConstructor = /constructor\s*\(/i.test(source_code);

        if (proxyType !== 'None detected' && hasConstructor && !hasInitializer) {
          findings.push(
            'WARNING: Proxy contract has constructor but no initializer. Constructors do not run in proxy context.',
          );
        }

        if (/Initializable/i.test(source_code) && !/initializer\b/i.test(source_code)) {
          findings.push(
            'WARNING: Imports Initializable but no function uses initializer modifier.',
          );
        }

        // Storage gaps
        if (proxyType !== 'None detected') {
          if (!/uint256\[\d+\]\s+private\s+__gap|__gap/i.test(source_code)) {
            findings.push(
              'WARNING: No storage gap detected. Add uint256[50] private __gap for future storage safety.',
            );
          }
        }

        const lines: string[] = [
          `## Upgradability Analysis`,
          `- **Proxy Pattern**: ${proxyType}`,
          `- **Has Initializer**: ${hasInitializer ? 'Yes' : 'No'}`,
          `- **Has Constructor**: ${hasConstructor ? 'Yes' : 'No'}`,
          '',
        ];

        if (findings.length > 0) {
          lines.push('### Findings');
          for (const f of findings) {
            lines.push(`- ${f}`);
          }
        } else {
          lines.push('No proxy or upgradability patterns detected.');
        }

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_check_upgradability failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
