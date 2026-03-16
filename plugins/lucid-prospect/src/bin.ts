#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createProspectServer } from './mcp.js';
import { logger } from './core/utils/logger.js';

async function main(): Promise<void> {
  logger.info('Starting Lucid Prospect MCP server...');

  const server = createProspectServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Lucid Prospect MCP server running on stdio');
}

main().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
