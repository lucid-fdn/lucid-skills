import { loadConfig } from './core/config/index.js';
import { EngineClient } from './core/engine/client.js';
import { createAllTools } from './core/tools/index.js';
import { toTypeBoxSchema } from './adapters/typebox-schema.js';
import { log } from './core/utils/logger.js';
import { PLUGIN_NAME } from './core/plugin-id.js';

export default function register(api: any): void {
  log.info(`Registering ${PLUGIN_NAME} plugin...`);

  const rawConfig = api.config ?? {};
  const config = loadConfig(rawConfig);

  const engine = new EngineClient({
    engineUrl: config.engineUrl,
    engineApiKey: config.engineApiKey,
  });

  const tools = createAllTools({ engine });

  for (const tool of tools) {
    api.registerTool(tool.name, {
      description: tool.description,
      parameters: toTypeBoxSchema(tool.params),
      execute: tool.execute,
    });
  }

  log.info(`${PLUGIN_NAME} plugin registered with ${tools.length} tools`);
}
