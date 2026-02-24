// ---------------------------------------------------------------------------
// tool-registration.test.ts -- Tests for all 13 tools registering
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}));

describe('Tool registration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('createAllTools returns 13 tools', async () => {
    const { createAllTools } = await import('../../src/core/tools/index.js');
    const { loadConfig } = await import('../../src/core/config/index.js');
    const config = loadConfig();

    const tools = createAllTools({
      config,
      fetcherRegistry: new Map(),
      notifierRegistry: new Map(),
    });

    expect(tools).toHaveLength(13);

    const names = tools.map((t) => t.name);
    expect(names).toContain('compete_add_competitor');
    expect(names).toContain('compete_list_competitors');
    expect(names).toContain('compete_update_competitor');
    expect(names).toContain('compete_remove_competitor');
    expect(names).toContain('compete_add_monitor');
    expect(names).toContain('compete_list_monitors');
    expect(names).toContain('compete_remove_monitor');
    expect(names).toContain('compete_fetch_now');
    expect(names).toContain('compete_list_signals');
    expect(names).toContain('compete_generate_battlecard');
    expect(names).toContain('compete_generate_brief');
    expect(names).toContain('compete_search');
    expect(names).toContain('compete_status');
  });

  it('all tools have valid ToolDefinition shape', async () => {
    const { createAllTools } = await import('../../src/core/tools/index.js');
    const { loadConfig } = await import('../../src/core/config/index.js');
    const config = loadConfig();

    const tools = createAllTools({
      config,
      fetcherRegistry: new Map(),
      notifierRegistry: new Map(),
    });

    for (const tool of tools) {
      expect(tool.name).toMatch(/^compete_/);
      expect(tool.description).toBeTruthy();
      expect(typeof tool.execute).toBe('function');
      expect(tool.params).toBeDefined();
    }
  });
});
