// ---------------------------------------------------------------------------
// providers.test.ts -- Tests for payment provider stubs
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStripeProvider } from '../../src/providers/stripe.js';
import { createPayPalProvider } from '../../src/providers/paypal.js';
import { createProviderRegistry } from '../../src/providers/index.js';
import { PaymentProviderError } from '../../src/core/errors.js';

// Suppress logger output in tests
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('createStripeProvider', () => {
  it('creates provider with valid API key', () => {
    const provider = createStripeProvider('sk_test_123');
    expect(provider).toBeDefined();
    expect(provider.createCustomer).toBeDefined();
    expect(provider.createInvoice).toBeDefined();
    expect(provider.createCharge).toBeDefined();
    expect(provider.createSubscription).toBeDefined();
  });

  it('throws on empty API key', () => {
    expect(() => createStripeProvider('')).toThrow(PaymentProviderError);
  });

  it('createCustomer returns an id', async () => {
    const provider = createStripeProvider('sk_test_123');
    const customer = await provider.createCustomer('test@test.com', 'Test');
    expect(customer.id).toMatch(/^cus_/);
  });

  it('createInvoice returns id and url', async () => {
    const provider = createStripeProvider('sk_test_123');
    const invoice = await provider.createInvoice('cus_1', 100, 'usd');
    expect(invoice.id).toMatch(/^inv_/);
    expect(invoice.url).toContain('stripe.com');
  });

  it('createCharge returns id and status', async () => {
    const provider = createStripeProvider('sk_test_123');
    const charge = await provider.createCharge(100, 'usd', 'src_1');
    expect(charge.id).toMatch(/^ch_/);
    expect(charge.status).toBe('succeeded');
  });

  it('createSubscription returns id and status', async () => {
    const provider = createStripeProvider('sk_test_123');
    const sub = await provider.createSubscription('cus_1', 'price_1');
    expect(sub.id).toMatch(/^sub_/);
    expect(sub.status).toBe('active');
  });
});

describe('createPayPalProvider', () => {
  it('creates provider with valid client ID', () => {
    const provider = createPayPalProvider('pp_client_123');
    expect(provider).toBeDefined();
    expect(provider.createInvoice).toBeDefined();
    expect(provider.checkPayment).toBeDefined();
  });

  it('throws on empty client ID', () => {
    expect(() => createPayPalProvider('')).toThrow(PaymentProviderError);
  });

  it('createInvoice returns id and url', async () => {
    const provider = createPayPalProvider('pp_client_123');
    const invoice = await provider.createInvoice('test@test.com', 100, 'USD');
    expect(invoice.id).toMatch(/^PP-INV-/);
    expect(invoice.url).toContain('paypal.com');
  });

  it('checkPayment returns status', async () => {
    const provider = createPayPalProvider('pp_client_123');
    const status = await provider.checkPayment('PP-INV-123');
    expect(status.status).toBe('UNPAID');
    expect(status.paidAt).toBeNull();
  });
});

describe('createProviderRegistry', () => {
  it('creates registry with no providers when no keys provided', () => {
    const registry = createProviderRegistry({
      supabaseUrl: 'http://localhost',
      supabaseKey: 'key',
      tenantId: 'default',
      companyName: 'Test',
      defaultCurrency: 'USD',
      defaultTaxRate: 0,
      defaultPaymentTerms: 30,
    });
    expect(registry.stripe).toBeNull();
    expect(registry.paypal).toBeNull();
  });

  it('creates registry with Stripe when key provided', () => {
    const registry = createProviderRegistry({
      supabaseUrl: 'http://localhost',
      supabaseKey: 'key',
      tenantId: 'default',
      companyName: 'Test',
      stripeApiKey: 'sk_test_123',
      defaultCurrency: 'USD',
      defaultTaxRate: 0,
      defaultPaymentTerms: 30,
    });
    expect(registry.stripe).not.toBeNull();
    expect(registry.paypal).toBeNull();
  });

  it('creates registry with PayPal when key provided', () => {
    const registry = createProviderRegistry({
      supabaseUrl: 'http://localhost',
      supabaseKey: 'key',
      tenantId: 'default',
      companyName: 'Test',
      paypalClientId: 'pp_client_123',
      defaultCurrency: 'USD',
      defaultTaxRate: 0,
      defaultPaymentTerms: 30,
    });
    expect(registry.stripe).toBeNull();
    expect(registry.paypal).not.toBeNull();
  });

  it('creates registry with both when both keys provided', () => {
    const registry = createProviderRegistry({
      supabaseUrl: 'http://localhost',
      supabaseKey: 'key',
      tenantId: 'default',
      companyName: 'Test',
      stripeApiKey: 'sk_test_123',
      paypalClientId: 'pp_client_123',
      defaultCurrency: 'USD',
      defaultTaxRate: 0,
      defaultPaymentTerms: 30,
    });
    expect(registry.stripe).not.toBeNull();
    expect(registry.paypal).not.toBeNull();
  });
});
