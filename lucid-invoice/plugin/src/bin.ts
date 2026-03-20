#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Lucid Invoice — CLI Entry Point
// ---------------------------------------------------------------------------

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createInvoiceServer } from './mcp.js';
import { logger } from './core/logger.js';
import { PLUGIN_NAME } from './core/plugin-id.js';

async function main() {
  logger.info(`Starting ${PLUGIN_NAME} MCP server via stdio`);

  const server = createInvoiceServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info(`${PLUGIN_NAME} MCP server running on stdio`);
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
