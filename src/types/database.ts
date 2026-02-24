// ---------------------------------------------------------------------------
// Lucid Invoice — Database Row Types
// ---------------------------------------------------------------------------

import type {
  BillingCycle,
  ClientStatus,
  Currency,
  InvoiceStatus,
  LineItem,
  PaymentMethod,
  SubscriptionStatus,
} from './common.js';

/** Base fields present on every table row. */
export interface BaseRow {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

// --- Clients ---

export interface ClientRow extends BaseRow {
  name: string;
  email: string;
  company: string | null;
  address: string | null;
  tax_id: string | null;
  payment_terms: number;
  status: ClientStatus;
}

export type ClientInsert = Omit<ClientRow, 'id' | 'created_at' | 'updated_at'>;
export type ClientUpdate = Partial<Omit<ClientInsert, 'tenant_id'>>;

// --- Invoices ---

export interface InvoiceRow extends BaseRow {
  client_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  currency: Currency;
  notes: string | null;
  paid_at: string | null;
  sent_at: string | null;
}

export type InvoiceInsert = Omit<InvoiceRow, 'id' | 'created_at' | 'updated_at'>;
export type InvoiceUpdate = Partial<Omit<InvoiceInsert, 'tenant_id'>>;

// --- Payments ---

export interface PaymentRow extends BaseRow {
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  received_at: string;
}

export type PaymentInsert = Omit<PaymentRow, 'id' | 'created_at' | 'updated_at'>;

// --- Subscriptions ---

export interface SubscriptionRow extends BaseRow {
  client_id: string;
  plan_name: string;
  amount: number;
  currency: Currency;
  cycle: BillingCycle;
  starts_at: string;
  next_billing: string;
  status: SubscriptionStatus;
  stripe_id: string | null;
}

export type SubscriptionInsert = Omit<SubscriptionRow, 'id' | 'created_at' | 'updated_at'>;
export type SubscriptionUpdate = Partial<Omit<SubscriptionInsert, 'tenant_id'>>;

// --- Revenue Metrics ---

export interface RevenueMetricRow extends BaseRow {
  period: string;
  mrr: number;
  arr: number;
  new_revenue: number;
  churn: number;
  net_revenue: number;
}

export type RevenueMetricInsert = Omit<RevenueMetricRow, 'id' | 'created_at' | 'updated_at'>;
