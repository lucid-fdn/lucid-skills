import type { PluginConfig } from '../core/types/config.js';
import { createTools } from '../core/tools/index.js';
import { PLUGIN_ID, PLUGIN_NAME } from '../core/plugin-id.js';

/**
 * OpenClaw adapter — export tool definitions for the OpenClaw registry.
 */
export function createOpenClawManifest(config: PluginConfig) {
  const tools = createTools(config);

  return {
    id: PLUGIN_ID,
    name: PLUGIN_NAME,
    version: '1.0.0',
    description: 'Crypto tax calculation, DeFi transaction categorization, cost basis tracking, tax-loss harvesting, and multi-jurisdiction reporting.',
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
}
