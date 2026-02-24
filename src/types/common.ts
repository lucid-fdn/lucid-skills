// ---------------------------------------------------------------------------
// Lucid Invoice — Domain Constants & Types
// ---------------------------------------------------------------------------

/** All possible states an invoice can be in throughout its lifecycle. */
export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Accepted payment methods for recording transactions. */
export const PAYMENT_METHODS = [
  'bank_transfer',
  'credit_card',
  'paypal',
  'crypto',
  'check',
  'cash',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Supported billing cycles for recurring subscriptions. */
export const BILLING_CYCLES = ['one_time', 'weekly', 'monthly', 'quarterly', 'annual'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** Supported currency codes. */
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Tax classification types. */
export const TAX_TYPES = ['vat', 'gst', 'sales_tax', 'none'] as const;
export type TaxType = (typeof TAX_TYPES)[number];

/** Client relationship statuses. */
export const CLIENT_STATUSES = ['active', 'inactive', 'prospect'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

/** Subscription statuses. */
export const SUBSCRIPTION_STATUSES = ['active', 'paused', 'cancelled', 'expired'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

// ---------------------------------------------------------------------------
// Shared interfaces
// ---------------------------------------------------------------------------

/** A single line item on an invoice. */
export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

/** Revenue period granularity for reporting. */
export const REVENUE_PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'] as const;
export type RevenuePeriod = (typeof REVENUE_PERIODS)[number];

/** Aging bucket thresholds (in days). */
export const AGING_BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];
