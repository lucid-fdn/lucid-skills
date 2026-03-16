// ---------------------------------------------------------------------------
// Lucid Invoice — Configuration Types
// ---------------------------------------------------------------------------

import type { Currency } from './common.js';

/** Full plugin configuration loaded from environment or explicit options. */
export interface InvoiceConfig {
  /** Supabase project URL. */
  supabaseUrl: string;
  /** Supabase service-role or anon key. */
  supabaseKey: string;
  /** Multi-tenant isolation identifier. */
  tenantId: string;

  // --- Optional payment provider keys ---
  stripeApiKey?: string;
  paypalClientId?: string;

  // --- Company identity ---
  companyName: string;
  companyEmail?: string;
  companyAddress?: string;

  // --- Defaults ---
  defaultCurrency: Currency;
  defaultTaxRate: number;
  /** Default net-days payment terms. */
  defaultPaymentTerms: number;

  // --- Integrations ---
  slackWebhookUrl?: string;
  /** Cron expression or "daily"/"weekly" schedule for overdue reminders. */
  overdueReminderSchedule?: string;
}

/** Minimal subset required to initialise the database client. */
export type DbConfig = Pick<InvoiceConfig, 'supabaseUrl' | 'supabaseKey' | 'tenantId'>;
