import { describe, it, expect } from 'vitest';
import { createAllTools } from '../../src/core/tools/index.js';
import type { PluginConfig, ProviderRegistry, ProspectProvider } from '../../src/core/types/index.js';
import { createClient } from '@supabase/supabase-js';

function createMockDeps() {
  const config: PluginConfig = {
    supabaseUrl: 'http://localhost:54321',
    supabaseKey: 'test-key',
    tenantId: 'default',
    defaultScoreThreshold: 50,
    enrichSchedule: '0 2 * * *',
  };

  const db = createClient(config.supabaseUrl, config.supabaseKey);

  const mockProvider: ProspectProvider = {
    name: 'mock',
    isConfigured: () => true,
  };

  const registry: ProviderRegistry = {
    providers: [mockProvider],
    getConfigured: () => [mockProvider],
    findLeads: async () => [],
    enrichLead: async () => ({ provider: 'mock' }),
    enrichCompany: async () => ({ provider: 'mock' }),
    findEmails: async () => [],
    verifyEmail: async () => ({
      email: '',
      status: 'unknown' as const,
      mx_found: false,
      smtp_check: false,
      is_catch_all: false,
      is_disposable: false,
      provider: 'mock',
    }),
  };

  return { config, db, registry };
}

describe('Tool Registration', () => {
  it('should create all 15 tools', () => {
    const deps = createMockDeps();
    const tools = createAllTools(deps);
    expect(tools).toHaveLength(15);
  });

  it('should have unique tool names', () => {
    const deps = createMockDeps();
    const tools = createAllTools(deps);
    const names = tools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('should prefix all tool names with prospect_', () => {
    const deps = createMockDeps();
    const tools = createAllTools(deps);
    for (const tool of tools) {
      expect(tool.name).toMatch(/^prospect_/);
    }
  });

  it('should have non-empty descriptions', () => {
    const deps = createMockDeps();
    const tools = createAllTools(deps);
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it('should have execute functions', () => {
    const deps = createMockDeps();
    const tools = createAllTools(deps);
    for (const tool of tools) {
      expect(typeof tool.execute).toBe('function');
    }
  });

  it('should include expected tool names', () => {
    const deps = createMockDeps();
    const tools = createAllTools(deps);
    const names = tools.map((t) => t.name);

    const expected = [
      'prospect_find_leads',
      'prospect_enrich_lead',
      'prospect_enrich_company',
      'prospect_find_emails',
      'prospect_verify_email',
      'prospect_build_list',
      'prospect_score_leads',
      'prospect_find_companies',
      'prospect_get_icp_match',
      'prospect_export_leads',
      'prospect_manage_campaign',
      'prospect_get_insights',
      'prospect_search_prospects',
      'prospect_get_lead_research',
      'prospect_status',
    ];

    for (const name of expected) {
      expect(names).toContain(name);
    }
  });
});
