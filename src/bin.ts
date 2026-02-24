#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCompeteServer } from './mcp.js';

const server = createCompeteServer();
const transport = new StdioServerTransport();
await server.connect(transport);
