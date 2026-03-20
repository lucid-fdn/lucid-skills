// ---------------------------------------------------------------------------
// Lucid Invoice — Provider Registry
// ---------------------------------------------------------------------------

import type { InvoiceConfig } from '../types/config.js';
import { createStripeProvider, type StripeProvider } from './stripe.js';
import { createPayPalProvider, type PayPalProvider } from './paypal.js';
import { logger } from '../core/logger.js';

export interface ProviderRegistry {
  stripe: StripeProvider | null;
  paypal: PayPalProvider | null;
}

/**
 * Initialise all configured payment providers.
 * Providers without credentials are left as null.
 */
export function createProviderRegistry(config: InvoiceConfig): ProviderRegistry {
  let stripe: StripeProvider | null = null;
  let paypal: PayPalProvider | null = null;

  if (config.stripeApiKey) {
    try {
      stripe = createStripeProvider(config.stripeApiKey);
    } catch (e) {
      logger.warn(`Stripe provider failed to initialise: ${e}`);
    }
  }

  if (config.paypalClientId) {
    try {
      paypal = createPayPalProvider(config.paypalClientId);
    } catch (e) {
      logger.warn(`PayPal provider failed to initialise: ${e}`);
    }
  }

  logger.info(
    `Provider registry: Stripe=${stripe ? 'active' : 'none'}, PayPal=${paypal ? 'active' : 'none'}`,
  );

  return { stripe, paypal };
}

export type { StripeProvider } from './stripe.js';
export type { PayPalProvider } from './paypal.js';
