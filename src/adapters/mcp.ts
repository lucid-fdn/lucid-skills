import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PluginConfig } from '../core/types/config.js';
import { createTools, type ToolDefinition } from '../core/tools/index.js';
import { PLUGIN_ID, PLUGIN_NAME } from '../core/plugin-id.js';
import { logger } from '../core/utils/logger.js';

/**
 * Register a tool definition with the MCP server.
 */
function registerTool(server: McpServer, tool: ToolDefinition): void {
  const shape = tool.inputSchema instanceof z.ZodObject ? tool.inputSchema.shape : {};

  server.tool(tool.name, tool.description, shape as Record<string, z.ZodType>, async (args) => {
    logger.debug(`Tool call: ${tool.name}`);
    return tool.handler(args);
  });
}

/**
 * Create a fully configured MCP server with all tax tools.
 */
export function createTaxServer(config: PluginConfig): McpServer {
  const server = new McpServer({
    name: PLUGIN_NAME,
    version: '1.0.0',
  });

  const tools = createTools(config);
  for (const tool of tools) {
    registerTool(server, tool);
  }

  logger.info(`${PLUGIN_NAME} MCP server created with ${tools.length} tools`);
  return server;
}
