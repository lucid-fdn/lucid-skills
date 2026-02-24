import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './core/config/loader.js';
import { createTaxServer } from './adapters/mcp.js';
import { logger } from './core/utils/logger.js';

export { createTaxServer } from './adapters/mcp.js';

async function main() {
  const config = loadConfig();
  const server = createTaxServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Lucid Tax MCP server running on stdio');
}

main().catch((err) => {
  logger.error(`Fatal: ${String(err)}`);
  process.exit(1);
});
