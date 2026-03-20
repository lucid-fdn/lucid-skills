import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from './core/config/index.js';
import { EngineClient } from './core/engine/client.js';
import { createAllTools } from './core/tools/index.js';
import { toZodSchema } from './adapters/zod-schema.js';
import { log } from './core/utils/logger.js';
import { PLUGIN_NAME, PLUGIN_VERSION } from './core/plugin-id.js';

export function createVideoServer(env: Record<string, string | undefined> = process.env) {
  const server = new McpServer({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
  });

  const config = loadConfig(env);
  const engine = new EngineClient({
    engineUrl: config.engineUrl,
    engineApiKey: config.engineApiKey,
  });

  const tools = createAllTools({ engine });

  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      toZodSchema(tool.params).shape,
      async (params: Record<string, unknown>) => {
        const result = await tool.execute(params);
        return { content: [{ type: 'text' as const, text: result }] };
      },
    );
  }

  log.info(`${PLUGIN_NAME} MCP server created with ${tools.length} tools`);
  return server;
}
