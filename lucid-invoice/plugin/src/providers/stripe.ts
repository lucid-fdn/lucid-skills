// ---------------------------------------------------------------------------
// Lucid Invoice — Stripe Payment Provider
// ---------------------------------------------------------------------------

import { PaymentProviderError } from '../core/errors.js';
import { logger } from '../core/logger.js';

export interface StripeProvider {
  createCustomer(email: string, name: string): Promise<{ id: string }>;
  createInvoice(customerId: string, amount: number, currency: string): Promise<{ id: string; url: string }>;
  createCharge(amount: number, currency: string, source: string): Promise<{ id: string; status: string }>;
  createSubscription(customerId: string, priceId: string): Promise<{ id: string; status: string }>;
}

/**
 * Create a Stripe provider instance.
 * In production this would use the Stripe SDK; here we define the interface
 * and provide a stub that logs calls for integration.
 */
export function createStripeProvider(apiKey: string): StripeProvider {
  if (!apiKey) {
    throw new PaymentProviderError('Stripe', 'API key is required');
  }

  logger.info('Stripe provider initialised');

  return {
    async createCustomer(email: string, name: string) {
      logger.info(`Stripe: creating customer ${email}`);
      // In production: const customer = await stripe.customers.create({ email, name });
      return { id: `cus_${Date.now()}` };
    },

    async createInvoice(customerId: string, amount: number, currency: string) {
      logger.info(`Stripe: creating invoice for ${customerId}, ${amount} ${currency}`);
      return { id: `inv_${Date.now()}`, url: `https://pay.stripe.com/inv_${Date.now()}` };
    },

    async createCharge(amount: number, currency: string, source: string) {
      logger.info(`Stripe: charging ${amount} ${currency} from ${source}`);
      return { id: `ch_${Date.now()}`, status: 'succeeded' };
    },

    async createSubscription(customerId: string, priceId: string) {
      logger.info(`Stripe: creating subscription for ${customerId} with price ${priceId}`);
      return { id: `sub_${Date.now()}`, status: 'active' };
    },
  };
}
