import { describe, it, expect } from 'vitest';
import { createTools } from '../src/core/tools/handlers.js';
import type { PluginConfig } from '../src/core/types/config.js';

const testConfig: PluginConfig = {
  supabaseUrl: 'http://localhost:54321',
  supabaseKey: 'test-key',
  tenantId: 'test-tenant',
  defaultJurisdiction: 'us',
  defaultCostBasisMethod: 'fifo',
  taxYear: 2024,
};

describe('Tool Registration', () => {
  it('should register all 12 tools', () => {
    const tools = createTools(testConfig);
    expect(tools).toHaveLength(12);
  });

  it('should have unique tool names', () => {
    const tools = createTools(testConfig);
    const names = tools.map((t) => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('should have descriptions for all tools', () => {
    const tools = createTools(testConfig);
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it('should have handler functions for all tools', () => {
    const tools = createTools(testConfig);
    for (const tool of tools) {
      expect(typeof tool.handler).toBe('function');
    }
  });

  it('should include expected tool names', () => {
    const tools = createTools(testConfig);
    const names = tools.map((t) => t.name);
    expect(names).toContain('tax_import_wallet');
    expect(names).toContain('tax_classify_transactions');
    expect(names).toContain('tax_calculate_gains');
    expect(names).toContain('tax_get_summary');
    expect(names).toContain('tax_generate_report');
    expect(names).toContain('tax_find_harvesting');
    expect(names).toContain('tax_get_cost_basis');
    expect(names).toContain('tax_track_income');
    expect(names).toContain('tax_compare_methods');
    expect(names).toContain('tax_get_unrealized');
    expect(names).toContain('tax_audit_transactions');
    expect(names).toContain('tax_status');
  });

  it('should have input schemas for all tools', () => {
    const tools = createTools(testConfig);
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined();
    }
  });
});
