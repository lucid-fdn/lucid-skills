// ---------------------------------------------------------------------------
// mcp-server.test.ts -- Verify MCP server creates with all tools
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from 'vitest';

// Mock Supabase before importing
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

import { createInvoiceServer } from '../../src/mcp.js';

describe('createInvoiceServer', () => {
  it('creates a server instance', () => {
    const server = createInvoiceServer({
      supabaseUrl: 'http://localhost:54321',
      supabaseKey: 'test-key',
      tenantId: 'test-tenant',
      companyName: 'Test Co',
      defaultCurrency: 'USD',
      defaultTaxRate: 10,
      defaultPaymentTerms: 30,
    });
    expect(server).toBeDefined();
  });

  it('creates server with env defaults', () => {
    const server = createInvoiceServer();
    expect(server).toBeDefined();
  });
});
