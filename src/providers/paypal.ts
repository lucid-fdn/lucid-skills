// ---------------------------------------------------------------------------
// Lucid Invoice — PayPal Payment Provider
// ---------------------------------------------------------------------------

import { PaymentProviderError } from '../core/errors.js';
import { logger } from '../core/logger.js';

export interface PayPalProvider {
  createInvoice(recipientEmail: string, amount: number, currency: string): Promise<{ id: string; url: string }>;
  checkPayment(invoiceId: string): Promise<{ status: string; paidAt: string | null }>;
}

/**
 * Create a PayPal provider instance.
 * Stub implementation for the interface — real integration would use PayPal REST SDK.
 */
export function createPayPalProvider(clientId: string): PayPalProvider {
  if (!clientId) {
    throw new PaymentProviderError('PayPal', 'Client ID is required');
  }

  logger.info('PayPal provider initialised');

  return {
    async createInvoice(recipientEmail: string, amount: number, currency: string) {
      logger.info(`PayPal: creating invoice for ${recipientEmail}, ${amount} ${currency}`);
      return {
        id: `PP-INV-${Date.now()}`,
        url: `https://www.paypal.com/invoice/p/#PP-INV-${Date.now()}`,
      };
    },

    async checkPayment(invoiceId: string) {
      logger.info(`PayPal: checking payment status for ${invoiceId}`);
      return { status: 'UNPAID', paidAt: null };
    },
  };
}
