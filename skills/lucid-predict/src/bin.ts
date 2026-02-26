#!/usr/bin/env node
// ---------------------------------------------------------------------------
// bin.ts -- Stdio entry point for Lucid Predict MCP
// ---------------------------------------------------------------------------

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createPredictServer } from './mcp.js';

async function main(): Promise<void> {
  const server = createPredictServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
