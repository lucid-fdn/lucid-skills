// ---------------------------------------------------------------------------
// test/helpers/fixtures.ts -- Shared test data
// ---------------------------------------------------------------------------

import type { InvoiceRow, ClientRow, PaymentRow, SubscriptionRow, RevenueMetricRow } from '../../src/types/database.js';
import type { LineItem } from '../../src/types/common.js';

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export function makeClient(overrides: Partial<ClientRow> = {}): ClientRow {
  return {
    id: 'client-001',
    tenant_id: 'test-tenant',
    name: 'Acme Corp',
    email: 'billing@acme.com',
    company: 'Acme Corporation',
    address: '123 Main St',
    tax_id: 'US-123456',
    payment_terms: 30,
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeClient2(overrides: Partial<ClientRow> = {}): ClientRow {
  return {
    id: 'client-002',
    tenant_id: 'test-tenant',
    name: 'Globex Inc',
    email: 'ap@globex.com',
    company: 'Globex Inc',
    address: '456 Oak Ave',
    tax_id: null,
    payment_terms: 15,
    status: 'active',
    created_at: '2025-02-01T00:00:00Z',
    updated_at: '2025-02-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Line Items
// ---------------------------------------------------------------------------

export function makeLineItems(): LineItem[] {
  return [
    { description: 'Web Development', quantity: 10, unit_price: 150, amount: 1500 },
    { description: 'Design Work', quantity: 5, unit_price: 100, amount: 500 },
  ];
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export function makeInvoice(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return {
    id: 'inv-001',
    tenant_id: 'test-tenant',
    client_id: 'client-001',
    invoice_number: 'INV-202501-0001',
    status: 'sent',
    issue_date: '2025-01-15',
    due_date: '2025-02-14',
    items: makeLineItems(),
    subtotal: 2000,
    tax_rate: 10,
    tax_amount: 200,
    discount: 0,
    total: 2200,
    currency: 'USD',
    notes: null,
    paid_at: null,
    sent_at: '2025-01-15T10:00:00Z',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
    ...overrides,
  };
}

export function makePaidInvoice(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return makeInvoice({
    id: 'inv-002',
    invoice_number: 'INV-202501-0002',
    status: 'paid',
    paid_at: '2025-02-01T12:00:00Z',
    total: 3000,
    subtotal: 2727.27,
    tax_amount: 272.73,
    ...overrides,
  });
}

export function makeOverdueInvoice(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return makeInvoice({
    id: 'inv-003',
    invoice_number: 'INV-202501-0003',
    status: 'overdue',
    due_date: '2025-01-01',
    total: 5000,
    ...overrides,
  });
}

export function makeDraftInvoice(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return makeInvoice({
    id: 'inv-004',
    invoice_number: 'INV-202502-0004',
    status: 'draft',
    sent_at: null,
    total: 1000,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function makePayment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 'pay-001',
    tenant_id: 'test-tenant',
    invoice_id: 'inv-001',
    amount: 1000,
    method: 'bank_transfer',
    reference: 'REF-12345',
    received_at: '2025-02-01T12:00:00Z',
    created_at: '2025-02-01T12:00:00Z',
    updated_at: '2025-02-01T12:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export function makeSubscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: 'sub-001',
    tenant_id: 'test-tenant',
    client_id: 'client-001',
    plan_name: 'Pro Plan',
    amount: 99,
    currency: 'USD',
    cycle: 'monthly',
    starts_at: '2025-01-01T00:00:00Z',
    next_billing: '2025-02-01T00:00:00Z',
    status: 'active',
    stripe_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeAnnualSubscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return makeSubscription({
    id: 'sub-002',
    plan_name: 'Enterprise Annual',
    amount: 10000,
    cycle: 'annual',
    ...overrides,
  });
}

export function makeWeeklySubscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return makeSubscription({
    id: 'sub-003',
    plan_name: 'Basic Weekly',
    amount: 25,
    cycle: 'weekly',
    ...overrides,
  });
}

export function makeQuarterlySubscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return makeSubscription({
    id: 'sub-004',
    plan_name: 'Team Quarterly',
    amount: 250,
    cycle: 'quarterly',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Revenue Metrics
// ---------------------------------------------------------------------------

export function makeRevenueMetric(overrides: Partial<RevenueMetricRow> = {}): RevenueMetricRow {
  return {
    id: 'rm-001',
    tenant_id: 'test-tenant',
    period: '2025-01',
    mrr: 5000,
    arr: 60000,
    new_revenue: 1000,
    churn: 200,
    net_revenue: 4800,
    created_at: '2025-01-31T00:00:00Z',
    updated_at: '2025-01-31T00:00:00Z',
    ...overrides,
  };
}
