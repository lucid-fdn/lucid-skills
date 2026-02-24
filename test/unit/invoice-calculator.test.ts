// ---------------------------------------------------------------------------
// invoice-calculator.test.ts -- Tests for invoice calculation logic
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  calculateLineItems,
  applyDiscount,
  calculateTax,
  generateInvoiceNumber,
  calculateLateFee,
  roundCurrency,
} from '../../src/analysis/invoice-calculator.js';

// ---------------------------------------------------------------------------
// roundCurrency
// ---------------------------------------------------------------------------

describe('roundCurrency', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundCurrency(10.005)).toBe(10.01);
  });

  it('keeps exact values unchanged', () => {
    expect(roundCurrency(100)).toBe(100);
  });

  it('rounds down correctly', () => {
    expect(roundCurrency(10.004)).toBe(10);
  });

  it('handles zero', () => {
    expect(roundCurrency(0)).toBe(0);
  });

  it('handles negative values', () => {
    expect(roundCurrency(-5.555)).toBe(-5.55);
  });

  it('handles very small values', () => {
    expect(roundCurrency(0.001)).toBe(0);
  });

  it('handles large values', () => {
    expect(roundCurrency(999999.999)).toBe(1000000);
  });
});

// ---------------------------------------------------------------------------
// calculateLineItems
// ---------------------------------------------------------------------------

describe('calculateLineItems', () => {
  it('calculates single line item correctly', () => {
    const result = calculateLineItems([
      { description: 'Service', quantity: 1, unit_price: 100 },
    ]);
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0]!.amount).toBe(100);
    expect(result.subtotal).toBe(100);
  });

  it('calculates multiple line items', () => {
    const result = calculateLineItems([
      { description: 'Dev', quantity: 10, unit_price: 150 },
      { description: 'Design', quantity: 5, unit_price: 100 },
    ]);
    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems[0]!.amount).toBe(1500);
    expect(result.lineItems[1]!.amount).toBe(500);
    expect(result.subtotal).toBe(2000);
  });

  it('handles fractional quantities', () => {
    const result = calculateLineItems([
      { description: 'Hours', quantity: 2.5, unit_price: 100 },
    ]);
    expect(result.lineItems[0]!.amount).toBe(250);
    expect(result.subtotal).toBe(250);
  });

  it('handles fractional prices', () => {
    const result = calculateLineItems([
      { description: 'Item', quantity: 3, unit_price: 33.33 },
    ]);
    expect(result.lineItems[0]!.amount).toBe(99.99);
    expect(result.subtotal).toBe(99.99);
  });

  it('throws on empty items array', () => {
    expect(() => calculateLineItems([])).toThrow('at least one line item');
  });

  it('throws on zero quantity', () => {
    expect(() =>
      calculateLineItems([{ description: 'Item', quantity: 0, unit_price: 100 }]),
    ).toThrow('Quantity must be positive');
  });

  it('throws on negative quantity', () => {
    expect(() =>
      calculateLineItems([{ description: 'Item', quantity: -1, unit_price: 100 }]),
    ).toThrow('Quantity must be positive');
  });

  it('throws on negative price', () => {
    expect(() =>
      calculateLineItems([{ description: 'Item', quantity: 1, unit_price: -50 }]),
    ).toThrow('Unit price cannot be negative');
  });

  it('allows zero price', () => {
    const result = calculateLineItems([
      { description: 'Free Item', quantity: 1, unit_price: 0 },
    ]);
    expect(result.lineItems[0]!.amount).toBe(0);
    expect(result.subtotal).toBe(0);
  });

  it('preserves description in output', () => {
    const result = calculateLineItems([
      { description: 'Consulting', quantity: 1, unit_price: 200 },
    ]);
    expect(result.lineItems[0]!.description).toBe('Consulting');
  });
});

// ---------------------------------------------------------------------------
// applyDiscount
// ---------------------------------------------------------------------------

describe('applyDiscount', () => {
  it('applies flat discount', () => {
    const result = applyDiscount(1000, 100, 'flat');
    expect(result.discountAmount).toBe(100);
    expect(result.discountedSubtotal).toBe(900);
  });

  it('applies percentage discount', () => {
    const result = applyDiscount(1000, 10, 'percentage');
    expect(result.discountAmount).toBe(100);
    expect(result.discountedSubtotal).toBe(900);
  });

  it('applies 100% discount', () => {
    const result = applyDiscount(500, 100, 'percentage');
    expect(result.discountAmount).toBe(500);
    expect(result.discountedSubtotal).toBe(0);
  });

  it('applies zero discount', () => {
    const result = applyDiscount(1000, 0, 'flat');
    expect(result.discountAmount).toBe(0);
    expect(result.discountedSubtotal).toBe(1000);
  });

  it('defaults to flat discount', () => {
    const result = applyDiscount(1000, 50);
    expect(result.discountAmount).toBe(50);
    expect(result.discountedSubtotal).toBe(950);
  });

  it('throws on negative discount', () => {
    expect(() => applyDiscount(1000, -10, 'flat')).toThrow('cannot be negative');
  });

  it('throws when flat discount exceeds subtotal', () => {
    expect(() => applyDiscount(100, 200, 'flat')).toThrow('cannot exceed subtotal');
  });

  it('throws when percentage exceeds 100', () => {
    expect(() => applyDiscount(1000, 150, 'percentage')).toThrow('cannot exceed 100%');
  });

  it('handles fractional percentage discount', () => {
    const result = applyDiscount(1000, 7.5, 'percentage');
    expect(result.discountAmount).toBe(75);
    expect(result.discountedSubtotal).toBe(925);
  });

  it('rounds discount amount to currency precision', () => {
    const result = applyDiscount(333, 10, 'percentage');
    expect(result.discountAmount).toBe(33.3);
    expect(result.discountedSubtotal).toBe(299.7);
  });
});

// ---------------------------------------------------------------------------
// calculateTax
// ---------------------------------------------------------------------------

describe('calculateTax', () => {
  it('calculates tax on amount', () => {
    const result = calculateTax(1000, 10);
    expect(result.taxAmount).toBe(100);
    expect(result.total).toBe(1100);
  });

  it('handles zero tax rate', () => {
    const result = calculateTax(500, 0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(500);
  });

  it('handles 100% tax rate', () => {
    const result = calculateTax(200, 100);
    expect(result.taxAmount).toBe(200);
    expect(result.total).toBe(400);
  });

  it('rounds tax to currency precision', () => {
    const result = calculateTax(333.33, 7);
    expect(result.taxAmount).toBe(23.33);
    expect(result.total).toBe(356.66);
  });

  it('throws on negative tax rate', () => {
    expect(() => calculateTax(100, -5)).toThrow('between 0 and 100');
  });

  it('throws on tax rate over 100', () => {
    expect(() => calculateTax(100, 101)).toThrow('between 0 and 100');
  });

  it('handles zero amount with tax', () => {
    const result = calculateTax(0, 10);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// generateInvoiceNumber
// ---------------------------------------------------------------------------

describe('generateInvoiceNumber', () => {
  it('generates standard invoice number', () => {
    const num = generateInvoiceNumber(1);
    expect(num).toMatch(/^INV-\d{6}-0001$/);
  });

  it('pads sequence number to 4 digits', () => {
    const num = generateInvoiceNumber(42);
    expect(num).toMatch(/-0042$/);
  });

  it('handles large sequence numbers', () => {
    const num = generateInvoiceNumber(12345);
    expect(num).toMatch(/-12345$/);
  });

  it('allows custom prefix', () => {
    const num = generateInvoiceNumber(1, 'QUOTE');
    expect(num).toMatch(/^QUOTE-\d{6}-0001$/);
  });

  it('throws on zero sequence number', () => {
    expect(() => generateInvoiceNumber(0)).toThrow('Sequence number must be >= 1');
  });

  it('throws on negative sequence number', () => {
    expect(() => generateInvoiceNumber(-1)).toThrow('Sequence number must be >= 1');
  });

  it('includes current year-month', () => {
    const now = new Date();
    const expectedYm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const num = generateInvoiceNumber(1);
    expect(num).toContain(expectedYm);
  });
});

// ---------------------------------------------------------------------------
// calculateLateFee
// ---------------------------------------------------------------------------

describe('calculateLateFee', () => {
  it('calculates late fee for overdue days', () => {
    const fee = calculateLateFee(1000, 30);
    // 1.5% per month / 30 days * 30 days * 1000 = 15
    expect(fee).toBe(15);
  });

  it('returns 0 for zero days overdue', () => {
    expect(calculateLateFee(1000, 0)).toBe(0);
  });

  it('returns 0 for negative days', () => {
    expect(calculateLateFee(1000, -5)).toBe(0);
  });

  it('returns 0 for zero total', () => {
    expect(calculateLateFee(0, 30)).toBe(0);
  });

  it('returns 0 for negative total', () => {
    expect(calculateLateFee(-100, 30)).toBe(0);
  });

  it('allows custom monthly rate', () => {
    const fee = calculateLateFee(1000, 30, 3);
    // 3% per month / 30 days * 30 days * 1000 = 30
    expect(fee).toBe(30);
  });

  it('pro-rates daily correctly', () => {
    const fee = calculateLateFee(1000, 15);
    // 1.5% per month / 30 days * 15 days * 1000 = 7.5
    expect(fee).toBe(7.5);
  });

  it('handles single day overdue', () => {
    const fee = calculateLateFee(1000, 1);
    // 1.5% per month / 30 days * 1 day * 1000 = 0.5
    expect(fee).toBe(0.5);
  });
});
