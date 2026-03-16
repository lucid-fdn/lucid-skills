// ---------------------------------------------------------------------------
// openclaw.ts -- OpenClaw plugin registration for Lucid Predict
// ---------------------------------------------------------------------------

import { loadConfig } from './config.js';
import { PlatformRegistry } from './adapters/registry.js';
import { PolymarketAdapter } from './adapters/polymarket.js';
import { ManifoldAdapter } from './adapters/manifold.js';
import { KalshiAdapter } from './adapters/kalshi.js';
import { createAllTools } from './tools/index.js';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION } from './plugin-id.js';
import { log } from './utils/logger.js';

export default function register(api: any): void {
  const config = loadConfig();
  log.setLevel(config.logLevel);

  const registry = new PlatformRegistry();
  registry.register(new PolymarketAdapter(config.polymarketApiUrl));
  registry.register(new ManifoldAdapter(config.manifoldApiUrl));
  if (config.kalshiApiKey) {
    registry.register(new KalshiAdapter(config.kalshiApiUrl, config.kalshiApiKey));
  }

  const tools = createAllTools({ config, registry });

  for (const tool of tools) {
    api.registerTool({
      id: `${PLUGIN_ID}:${tool.name}`,
      name: tool.name,
      description: tool.description,
      parameters: tool.params,
      execute: async (params: Record<string, unknown>) => {
        return await tool.execute(params);
      },
    });
  }

  log.info(`${PLUGIN_NAME} v${PLUGIN_VERSION} registered (${tools.length} tools)`);
}
