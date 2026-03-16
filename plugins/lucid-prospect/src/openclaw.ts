import { PLUGIN_ID } from './core/plugin-id.js';
import { loadConfig } from './core/config/loader.js';
import { getClient } from './core/db/client.js';
import { createProviderRegistry } from './core/providers/index.js';
import { createAllTools } from './core/tools/index.js';
import { toTypeBoxSchema } from './adapters/typebox-schema.js';
import { logger } from './core/utils/logger.js';

export interface OpenClawApi {
  registerTool(opts: {
    pluginId: string;
    name: string;
    description: string;
    schema: unknown;
    execute: (params: Record<string, unknown>) => Promise<string>;
  }): void;
}

export default function register(api: OpenClawApi): void {
  const config = loadConfig();
  const db = getClient(config.supabaseUrl, config.supabaseKey);
  const registry = createProviderRegistry(config);
  const tools = createAllTools({ config, db, registry });

  for (const tool of tools) {
    const schema = toTypeBoxSchema(tool.params);
    api.registerTool({
      pluginId: PLUGIN_ID,
      name: tool.name,
      description: tool.description,
      schema,
      execute: tool.execute,
    });
  }

  logger.info(`Registered ${tools.length} tools with OpenClaw`);
}
