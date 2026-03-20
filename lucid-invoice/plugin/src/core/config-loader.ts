// ---------------------------------------------------------------------------
// Lucid Invoice — Configuration Loader
// ---------------------------------------------------------------------------

import { ConfigError } from './errors.js';
import type { InvoiceConfig } from '../types/config.js';
import type { Currency } from '../types/common.js';
import { CURRENCIES } from '../types/common.js';

/**
 * Load config from environment variables (INVOICE_ prefix).
 * Throws ConfigError when required variables are missing.
 */
export function loadConfig(overrides: Partial<InvoiceConfig> = {}): InvoiceConfig {
  const env = process.env;

  const supabaseUrl = overrides.supabaseUrl ?? env.INVOICE_SUPABASE_URL;
  const supabaseKey = overrides.supabaseKey ?? env.INVOICE_SUPABASE_KEY;
  const tenantId = overrides.tenantId ?? env.INVOICE_TENANT_ID ?? 'default';
  const companyName = overrides.companyName ?? env.INVOICE_COMPANY_NAME ?? 'My Company';

  if (!supabaseUrl) throw new ConfigError('INVOICE_SUPABASE_URL is required');
  if (!supabaseKey) throw new ConfigError('INVOICE_SUPABASE_KEY is required');

  const rawCurrency = (
    overrides.defaultCurrency ??
    env.INVOICE_DEFAULT_CURRENCY ??
    'USD'
  ).toUpperCase() as Currency;

  if (!CURRENCIES.includes(rawCurrency)) {
    throw new ConfigError(`Unsupported currency: ${rawCurrency}`);
  }

  const rawTaxRate = overrides.defaultTaxRate ?? parseFloat(env.INVOICE_DEFAULT_TAX_RATE ?? '0');
  if (isNaN(rawTaxRate) || rawTaxRate < 0 || rawTaxRate > 100) {
    throw new ConfigError('INVOICE_DEFAULT_TAX_RATE must be between 0 and 100');
  }

  const rawPaymentTerms =
    overrides.defaultPaymentTerms ?? parseInt(env.INVOICE_DEFAULT_PAYMENT_TERMS ?? '30', 10);
  if (isNaN(rawPaymentTerms) || rawPaymentTerms < 0) {
    throw new ConfigError('INVOICE_DEFAULT_PAYMENT_TERMS must be a non-negative integer');
  }

  return {
    supabaseUrl,
    supabaseKey,
    tenantId,
    stripeApiKey: overrides.stripeApiKey ?? env.INVOICE_STRIPE_API_KEY,
    paypalClientId: overrides.paypalClientId ?? env.INVOICE_PAYPAL_CLIENT_ID,
    companyName,
    companyEmail: overrides.companyEmail ?? env.INVOICE_COMPANY_EMAIL,
    companyAddress: overrides.companyAddress ?? env.INVOICE_COMPANY_ADDRESS,
    defaultCurrency: rawCurrency,
    defaultTaxRate: rawTaxRate,
    defaultPaymentTerms: rawPaymentTerms,
    slackWebhookUrl: overrides.slackWebhookUrl ?? env.INVOICE_SLACK_WEBHOOK_URL,
    overdueReminderSchedule:
      overrides.overdueReminderSchedule ?? env.INVOICE_OVERDUE_REMINDER_SCHEDULE,
  };
}
