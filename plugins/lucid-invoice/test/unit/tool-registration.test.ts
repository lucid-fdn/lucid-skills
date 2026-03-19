// ---------------------------------------------------------------------------
// tool-registration.test.ts -- Verify all 11 tools register correctly
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

import { createToolRegistry } from '../../src/tools/handlers.js';
import { initDbClient } from '../../src/db/client.js';

// Initialise mock DB before tests
initDbClient({
  supabaseUrl: 'http://localhost:54321',
  supabaseKey: 'test-key',
  tenantId: 'test-tenant',
});

describe('tool registration', () => {
  const tools = createToolRegistry();

  it('creates exactly 11 tools', () => {
    expect(tools.length).toBe(11);
  });

  it('all tools have unique names', () => {
    const names = tools.map((t) => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('all tools have invoice_ prefix', () => {
    for (const tool of tools) {
      expect(tool.name).toMatch(/^invoice_/);
    }
  });

  it('all tools have descriptions', () => {
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it('all tools have handler functions', () => {
    for (const tool of tools) {
      expect(typeof tool.handler).toBe('function');
    }
  });

  it('all tools have inputSchema', () => {
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('includes invoice_create_client tool', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('invoice_create_client');
  });

  it('includes invoice_create_invoice tool', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('invoice_create_invoice');
  });

  it('includes invoice_send_invoice tool', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('invoice_send_invoice');
  });

  it('includes invoice_record_payment tool', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('invoice_record_payment');
  });

  it('includes invoice_get_outstanding tool', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('invoice_get_outstanding');
  });

  it('includes invoice_create_subscription tool', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('invoice_create_subscription');
  });

  it('includes invoice_get_revenue tool', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('invoice_get_revenue');
  });

  it('includes invoice_manage_clients tool', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('invoice_manage_clients');
  });

  it('includes invoice_get_aging_report tool', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('invoice_get_aging_report');
  });

  it('includes invoice_forecast_revenue tool', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('invoice_forecast_revenue');
  });

  it('includes invoice_status tool', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('invoice_status');
  });
});
