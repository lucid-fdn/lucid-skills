// ---------------------------------------------------------------------------
// status.ts -- System health
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { ToolDependencies } from './index.js';
import { PLUGIN_NAME, PLUGIN_VERSION } from '../plugin-id.js';
import { log } from '../utils/logger.js';

export function createStatusTool(deps: ToolDependencies): ToolDefinition {
  return {
    name: 'audit_status',
    description:
      'System health and configuration status: version info, configured providers, database connection, and settings.',
    params: {},
    execute: async (): Promise<string> => {
      try {
        const lines: string[] = [
          `## ${PLUGIN_NAME} v${PLUGIN_VERSION}`,
          '',
          '### Configuration',
          `- Tenant: ${deps.config.tenantId}`,
          `- Max contract size: ${deps.config.maxContractSize} bytes`,
          `- Scan schedule: ${deps.config.scanSchedule}`,
          '',
          '### Providers',
          `- Etherscan API: ${deps.config.etherscanApiKey ? 'Configured' : 'Not configured'}`,
          `- Slither: ${deps.config.slitherPath ? 'Configured' : 'Not configured'}`,
          `- Mythril: ${deps.config.mythrilPath ? 'Configured' : 'Not configured'}`,
          '',
          '### Notifications',
          `- Slack webhook: ${deps.config.slackWebhookUrl ? 'Configured' : 'Not configured'}`,
          '',
          '### Database',
          `- Supabase URL: ${deps.config.supabaseUrl ? 'Configured' : 'Not configured'}`,
        ];

        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('audit_status failed', err);
        return `Error: ${msg}`;
      }
    },
  };
}
