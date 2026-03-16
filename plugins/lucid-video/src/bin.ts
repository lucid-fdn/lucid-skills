#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createVideoServer } from './mcp.js';

const server = createVideoServer();
const transport = new StdioServerTransport();
await server.connect(transport);
