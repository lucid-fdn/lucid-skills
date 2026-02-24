// ---------------------------------------------------------------------------
// Lucid Invoice — MCP Server Entry Point
// ---------------------------------------------------------------------------

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION } from './core/plugin-id.js';
import { loadConfig } from './core/config-loader.js';
import { logger } from './core/logger.js';
import { initDbClient } from './db/client.js';
import { createToolRegistry } from './tools/handlers.js';
import { ok, err } from './tools/types.js';
import type { InvoiceConfig } from './types/config.js';

/**
 * Create and configure the Lucid Invoice MCP server.
 */
export function createInvoiceServer(overrides?: Partial<InvoiceConfig>): McpServer {
  const config = loadConfig(overrides);
  initDbClient(config);

  const server = new McpServer({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
  });

  const tools = createToolRegistry();

  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      {},
      async (args: Record<string, unknown>) => {
        try {
          const result = await tool.handler(args);
          return result;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return err(msg);
        }
      },
    );
  }

  logger.info(`${PLUGIN_NAME} MCP server created with ${tools.length} tools`);
  return server;
}

export { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION };
