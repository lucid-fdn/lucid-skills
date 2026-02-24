import { loadConfig } from './core/config/index.js';
import { initSupabase } from './core/db/client.js';
import { createFetcherRegistry } from './core/fetchers/index.js';
import { createNotifierRegistry } from './core/alerts/index.js';
import { createAllTools } from './core/tools/index.js';
import { startScheduler, stopScheduler } from './core/services/index.js';
import { toTypeBoxSchema } from './adapters/typebox-schema.js';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION } from './core/plugin-id.js';
import { log } from './core/utils/logger.js';

export default function register(api: any): void {
  const config = loadConfig();
  initSupabase(config.supabaseUrl, config.supabaseKey);

  const fetcherRegistry = createFetcherRegistry(config);
  const notifierRegistry = createNotifierRegistry(config);
  const tools = createAllTools({ config, fetcherRegistry, notifierRegistry });

  // Register tools
  for (const tool of tools) {
    api.registerTool({
      id: `${PLUGIN_ID}:${tool.name}`,
      name: tool.name,
      description: tool.description,
      parameters: toTypeBoxSchema(tool.params),
      execute: async (params: Record<string, unknown>) => {
        return await tool.execute(params);
      },
    });
  }

  // Register background service
  api.registerService({
    id: `${PLUGIN_ID}:scheduler`,
    name: `${PLUGIN_NAME} Scheduler`,
    start: () => startScheduler({ config, fetcherRegistry, notifierRegistry }),
    stop: () => stopScheduler(),
  });

  log.info(`${PLUGIN_NAME} v${PLUGIN_VERSION} registered (${tools.length} tools, ${fetcherRegistry.size} fetchers)`);
}
