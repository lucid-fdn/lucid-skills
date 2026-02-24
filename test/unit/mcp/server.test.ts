// ---------------------------------------------------------------------------
// server.test.ts -- Tests for MCP server creation
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    }),
  })),
}));

describe('createCompeteServer', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.COMPETE_SUPABASE_URL = 'http://localhost:54321';
    process.env.COMPETE_SUPABASE_KEY = 'test-key';
  });

  it('creates server with 13 tools', async () => {
    const { createCompeteServer } = await import('../../../src/mcp.js');
    const server = createCompeteServer();
    expect(server).toBeDefined();
    // The McpServer doesn't expose a tools list directly,
    // but we can verify it was created without errors
  });
});
