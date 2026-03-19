import { describe, it, expect } from 'vitest';
import { createProspectServer } from '../../src/mcp.js';

describe('MCP Server', () => {
  it('should create server instance without error', () => {
    const server = createProspectServer({
      supabaseUrl: 'http://localhost:54321',
      supabaseKey: 'test-key',
      tenantId: 'test',
    });

    expect(server).toBeDefined();
  });
});
