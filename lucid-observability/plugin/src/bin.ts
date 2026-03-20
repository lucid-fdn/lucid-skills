#!/usr/bin/env node
// ---------------------------------------------------------------------------
// bin.ts -- Stdio entry point for Lucid Observability MCP
// ---------------------------------------------------------------------------

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createObservabilityServer } from './mcp.js';

async function main(): Promise<void> {
  const server = createObservabilityServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
