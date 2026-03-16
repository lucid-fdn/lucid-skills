// ---------------------------------------------------------------------------
// Lucid Invoice — Invoice Calculator
// ---------------------------------------------------------------------------

import { ValidationError } from '../core/errors.js';
import type { LineItem } from '../types/common.js';

/**
 * Calculate totals for a set of line items.
 * Returns items with computed `amount` fields plus the subtotal.
 */
export function calculateLineItems(
  items: Array<{ description: string; quantity: number; unit_price: number }>,
): { lineItems: LineItem[]; subtotal: number } {
  if (!items.length) {
    throw new ValidationError('Invoice must have at least one line item');
  }

  const lineItems: LineItem[] = items.map((item) => {
    if (item.quantity <= 0) {
      throw new ValidationError(`Quantity must be positive for "${item.description}"`);
    }
    if (item.unit_price < 0) {
      throw new ValidationError(`Unit price cannot be negative for "${item.description}"`);
    }
    const amount = roundCurrency(item.quantity * item.unit_price);
    return { ...item, amount };
  });

  const subtotal = roundCurrency(lineItems.reduce((sum, li) => sum + li.amount, 0));
  return { lineItems, subtotal };
}

/**
 * Apply a flat or percentage discount to a subtotal.
 * Returns the discount amount (always positive) and the discounted subtotal.
 */
export function applyDiscount(
  subtotal: number,
  discount: number,
  type: 'flat' | 'percentage' = 'flat',
): { discountAmount: number; discountedSubtotal: number } {
  if (discount < 0) throw new ValidationError('Discount cannot be negative');

  let discountAmount: number;
  if (type === 'percentage') {
    if (discount > 100) throw new ValidationError('Percentage discount cannot exceed 100%');
    discountAmount = roundCurrency(subtotal * (discount / 100));
  } else {
    if (discount > subtotal) throw new ValidationError('Flat discount cannot exceed subtotal');
    discountAmount = roundCurrency(discount);
  }

  return {
    discountAmount,
    discountedSubtotal: roundCurrency(subtotal - discountAmount),
  };
}

/**
 * Calculate tax on a given amount.
 */
export function calculateTax(
  amount: number,
  taxRate: number,
): { taxAmount: number; total: number } {
  if (taxRate < 0 || taxRate > 100) {
    throw new ValidationError('Tax rate must be between 0 and 100');
  }
  const taxAmount = roundCurrency(amount * (taxRate / 100));
  return { taxAmount, total: roundCurrency(amount + taxAmount) };
}

/**
 * Generate a sequential invoice number.
 * Format: INV-YYYYMM-NNNN
 */
export function generateInvoiceNumber(sequenceNumber: number, prefix = 'INV'): string {
  if (sequenceNumber < 1) throw new ValidationError('Sequence number must be >= 1');
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = String(sequenceNumber).padStart(4, '0');
  return `${prefix}-${ym}-${seq}`;
}

/**
 * Calculate a late fee based on days overdue and the invoice total.
 * Default: 1.5% per month (daily pro-rated).
 */
export function calculateLateFee(
  total: number,
  daysOverdue: number,
  monthlyRate = 1.5,
): number {
  if (daysOverdue <= 0) return 0;
  if (total <= 0) return 0;
  const dailyRate = monthlyRate / 30 / 100;
  return roundCurrency(total * dailyRate * daysOverdue);
}

/** Round to 2 decimal places (currency precision). */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
