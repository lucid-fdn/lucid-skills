// ---------------------------------------------------------------------------
// smoke.test.ts -- E2E smoke test for OpenClaw plugin registration
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}));

describe('E2E smoke test', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('OpenClaw plugin registers tools and service', async () => {
    const register = (await import('../../src/openclaw.js')).default;

    const registeredTools: any[] = [];
    const registeredServices: any[] = [];
    const mockApi = {
      registerTool: vi.fn((t: any) => registeredTools.push(t)),
      registerService: vi.fn((s: any) => registeredServices.push(s)),
    };

    register(mockApi);

    expect(registeredTools).toHaveLength(13);
    expect(registeredServices).toHaveLength(1);
    expect(registeredServices[0].name).toContain('Compete');
  });
});
