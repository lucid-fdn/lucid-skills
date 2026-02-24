import { describe, it, expect } from 'vitest';
import { createTaxServer } from '../src/adapters/mcp.js';
import type { PluginConfig } from '../src/core/types/config.js';

const testConfig: PluginConfig = {
  supabaseUrl: 'http://localhost:54321',
  supabaseKey: 'test-key',
  tenantId: 'test-tenant',
  defaultJurisdiction: 'us',
  defaultCostBasisMethod: 'fifo',
  taxYear: 2024,
};

describe('MCP Server', () => {
  it('should create a server instance without errors', () => {
    const server = createTaxServer(testConfig);
    expect(server).toBeDefined();
  });
});
