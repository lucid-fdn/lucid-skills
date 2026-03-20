import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION } from './core/plugin-id.js';
import { loadConfig } from './core/config/loader.js';
import { getClient } from './core/db/client.js';
import { createProviderRegistry } from './core/providers/index.js';
import { createAllTools } from './core/tools/index.js';
import { toZodSchema } from './adapters/zod-schema.js';
import type { PluginConfig } from './core/types/index.js';

export function createProspectServer(overrides?: Partial<PluginConfig>): McpServer {
  const config = loadConfig(overrides);
  const db = getClient(config.supabaseUrl, config.supabaseKey);
  const registry = createProviderRegistry(config);
  const tools = createAllTools({ config, db, registry });

  const server = new McpServer({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
  });

  for (const tool of tools) {
    const zodSchema = toZodSchema(tool.params);
    server.tool(
      `${PLUGIN_ID}__${tool.name}`,
      tool.description,
      zodSchema.shape,
      async (params: Record<string, unknown>) => {
        try {
          const text = await tool.execute(params);
          return { content: [{ type: 'text' as const, text }] };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text' as const, text: `Error: ${message}` }],
            isError: true,
          };
        }
      },
    );
  }

  return server;
}
