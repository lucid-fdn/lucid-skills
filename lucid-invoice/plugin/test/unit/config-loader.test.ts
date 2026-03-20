// ---------------------------------------------------------------------------
// config-loader.test.ts -- Tests for configuration loader
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/core/config-loader.js';

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env
    process.env = { ...originalEnv };
  });

  it('loads config from environment variables', () => {
    const config = loadConfig();
    expect(config.supabaseUrl).toBe('http://localhost:54321');
    expect(config.supabaseKey).toBe('test-key');
  });

  it('applies defaults for optional fields', () => {
    const config = loadConfig();
    expect(config.tenantId).toBe('test-tenant');
    expect(config.companyName).toBe('Test Company');
    expect(config.defaultCurrency).toBe('USD');
    expect(config.defaultTaxRate).toBe(10);
    expect(config.defaultPaymentTerms).toBe(30);
  });

  it('uses overrides over env vars', () => {
    const config = loadConfig({
      supabaseUrl: 'http://override.co',
      supabaseKey: 'override-key',
      tenantId: 'custom-tenant',
    });
    expect(config.supabaseUrl).toBe('http://override.co');
    expect(config.supabaseKey).toBe('override-key');
    expect(config.tenantId).toBe('custom-tenant');
  });

  it('throws when INVOICE_SUPABASE_URL is missing', () => {
    delete process.env.INVOICE_SUPABASE_URL;
    expect(() => loadConfig()).toThrow('INVOICE_SUPABASE_URL is required');
  });

  it('throws when INVOICE_SUPABASE_KEY is missing', () => {
    delete process.env.INVOICE_SUPABASE_KEY;
    expect(() => loadConfig()).toThrow('INVOICE_SUPABASE_KEY is required');
  });

  it('accepts valid currency', () => {
    const config = loadConfig({ defaultCurrency: 'EUR' });
    expect(config.defaultCurrency).toBe('EUR');
  });

  it('throws on unsupported currency', () => {
    expect(() => loadConfig({ defaultCurrency: 'BTC' as any })).toThrow('Unsupported currency');
  });

  it('validates tax rate range', () => {
    expect(() =>
      loadConfig({ defaultTaxRate: -1 }),
    ).toThrow('must be between 0 and 100');
  });

  it('validates tax rate upper bound', () => {
    expect(() =>
      loadConfig({ defaultTaxRate: 101 }),
    ).toThrow('must be between 0 and 100');
  });

  it('validates payment terms non-negative', () => {
    expect(() =>
      loadConfig({ defaultPaymentTerms: -5 }),
    ).toThrow('must be a non-negative integer');
  });

  it('allows zero tax rate', () => {
    const config = loadConfig({ defaultTaxRate: 0 });
    expect(config.defaultTaxRate).toBe(0);
  });

  it('allows zero payment terms', () => {
    const config = loadConfig({ defaultPaymentTerms: 0 });
    expect(config.defaultPaymentTerms).toBe(0);
  });

  it('includes optional Stripe key when provided', () => {
    const config = loadConfig({ stripeApiKey: 'sk_test_123' });
    expect(config.stripeApiKey).toBe('sk_test_123');
  });

  it('includes optional PayPal client ID when provided', () => {
    const config = loadConfig({ paypalClientId: 'pp_test' });
    expect(config.paypalClientId).toBe('pp_test');
  });

  it('includes optional Slack webhook when provided', () => {
    const config = loadConfig({ slackWebhookUrl: 'https://hooks.slack.com/xyz' });
    expect(config.slackWebhookUrl).toBe('https://hooks.slack.com/xyz');
  });

  it('omits undefined optional fields', () => {
    const config = loadConfig();
    expect(config.stripeApiKey).toBeUndefined();
    expect(config.paypalClientId).toBeUndefined();
    expect(config.slackWebhookUrl).toBeUndefined();
    expect(config.overdueReminderSchedule).toBeUndefined();
  });

  it('uses env var for company email', () => {
    process.env.INVOICE_COMPANY_EMAIL = 'billing@test.com';
    const config = loadConfig();
    expect(config.companyEmail).toBe('billing@test.com');
  });

  it('case-insensitive currency input', () => {
    const config = loadConfig({ defaultCurrency: 'eur' as any });
    expect(config.defaultCurrency).toBe('EUR');
  });
});
