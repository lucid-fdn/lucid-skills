// ---------------------------------------------------------------------------
// payment-tracker.test.ts -- Tests for payment tracking logic
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  trackPayment,
  checkOverdue,
  sendReminder,
  reconcilePayments,
  getOutstandingBalance,
  buildAgingReport,
} from '../../src/analysis/payment-tracker.js';
import {
  makeInvoice,
  makePaidInvoice,
  makeOverdueInvoice,
  makeDraftInvoice,
  makePayment,
} from '../helpers/fixtures.js';

// ---------------------------------------------------------------------------
// trackPayment
// ---------------------------------------------------------------------------

describe('trackPayment', () => {
  it('tracks a valid partial payment', () => {
    const result = trackPayment(1000, 0, 500, 'bank_transfer', 'REF-1');
    expect(result.amount).toBe(500);
    expect(result.method).toBe('bank_transfer');
    expect(result.reference).toBe('REF-1');
    expect(result.remainingBalance).toBe(500);
    expect(result.fullyPaid).toBe(false);
  });

  it('tracks a full payment', () => {
    const result = trackPayment(1000, 0, 1000, 'credit_card');
    expect(result.remainingBalance).toBe(0);
    expect(result.fullyPaid).toBe(true);
  });

  it('tracks a payment after partial', () => {
    const result = trackPayment(1000, 400, 600, 'paypal');
    expect(result.remainingBalance).toBe(0);
    expect(result.fullyPaid).toBe(true);
  });

  it('throws on zero amount', () => {
    expect(() => trackPayment(1000, 0, 0, 'bank_transfer')).toThrow('must be positive');
  });

  it('throws on negative amount', () => {
    expect(() => trackPayment(1000, 0, -100, 'bank_transfer')).toThrow('must be positive');
  });

  it('throws when payment exceeds remaining balance', () => {
    expect(() => trackPayment(1000, 900, 200, 'bank_transfer')).toThrow('exceeds remaining');
  });

  it('sets receivedAt to current ISO timestamp', () => {
    const result = trackPayment(100, 0, 50, 'cash');
    expect(result.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('defaults reference to null', () => {
    const result = trackPayment(100, 0, 50, 'cash');
    expect(result.reference).toBeNull();
  });

  it('handles very small remaining balance as fully paid', () => {
    const result = trackPayment(100, 99.995, 0.005, 'cash');
    expect(result.fullyPaid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkOverdue
// ---------------------------------------------------------------------------

describe('checkOverdue', () => {
  it('identifies overdue invoices', () => {
    const asOf = new Date('2025-03-01');
    const invoices = [
      makeInvoice({ id: 'i1', due_date: '2025-02-01', status: 'sent' }),
      makeInvoice({ id: 'i2', due_date: '2025-04-01', status: 'sent' }),
    ];
    const result = checkOverdue(invoices, asOf);
    expect(result).toHaveLength(1);
    expect(result[0]!.invoiceId).toBe('i1');
    expect(result[0]!.daysOverdue).toBe(28);
  });

  it('excludes paid invoices', () => {
    const asOf = new Date('2025-03-01');
    const invoices = [makePaidInvoice({ due_date: '2025-01-01' })];
    expect(checkOverdue(invoices, asOf)).toHaveLength(0);
  });

  it('excludes cancelled invoices', () => {
    const asOf = new Date('2025-03-01');
    const invoices = [makeInvoice({ status: 'cancelled', due_date: '2025-01-01' })];
    expect(checkOverdue(invoices, asOf)).toHaveLength(0);
  });

  it('excludes draft invoices', () => {
    const asOf = new Date('2025-03-01');
    const invoices = [makeDraftInvoice({ due_date: '2025-01-01' })];
    expect(checkOverdue(invoices, asOf)).toHaveLength(0);
  });

  it('excludes refunded invoices', () => {
    const asOf = new Date('2025-03-01');
    const invoices = [makeInvoice({ status: 'refunded', due_date: '2025-01-01' })];
    expect(checkOverdue(invoices, asOf)).toHaveLength(0);
  });

  it('sorts by most overdue first', () => {
    const asOf = new Date('2025-03-01');
    const invoices = [
      makeInvoice({ id: 'recent', due_date: '2025-02-15', status: 'sent' }),
      makeInvoice({ id: 'older', due_date: '2025-01-01', status: 'sent' }),
    ];
    const result = checkOverdue(invoices, asOf);
    expect(result[0]!.invoiceId).toBe('older');
    expect(result[1]!.invoiceId).toBe('recent');
  });

  it('returns empty for no overdue invoices', () => {
    const asOf = new Date('2025-01-01');
    const invoices = [makeInvoice({ due_date: '2025-12-31', status: 'sent' })];
    expect(checkOverdue(invoices, asOf)).toHaveLength(0);
  });

  it('returns empty for empty array', () => {
    expect(checkOverdue([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// sendReminder
// ---------------------------------------------------------------------------

describe('sendReminder', () => {
  it('generates reminder message', () => {
    const overdue = {
      invoiceId: 'inv-001',
      invoiceNumber: 'INV-202501-0001',
      clientId: 'c1',
      total: 2000,
      dueDate: '2025-01-15',
      daysOverdue: 30,
    };
    const msg = sendReminder(overdue, 'Test Co');
    expect(msg).toContain('INV-202501-0001');
    expect(msg).toContain('Test Co');
    expect(msg).toContain('$2000.00');
    expect(msg).toContain('2025-01-15');
    expect(msg).toContain('30');
  });

  it('includes payment request', () => {
    const overdue = {
      invoiceId: 'inv-x',
      invoiceNumber: 'INV-X',
      clientId: 'c1',
      total: 100,
      dueDate: '2025-01-01',
      daysOverdue: 5,
    };
    const msg = sendReminder(overdue, 'Acme');
    expect(msg).toContain('Please remit payment');
  });
});

// ---------------------------------------------------------------------------
// reconcilePayments
// ---------------------------------------------------------------------------

describe('reconcilePayments', () => {
  it('identifies balanced invoices', () => {
    const invoices = [makeInvoice({ id: 'i1', total: 1000 })];
    const payments = [makePayment({ invoice_id: 'i1', amount: 1000 })];
    const result = reconcilePayments(invoices, payments);
    expect(result[0]!.status).toBe('balanced');
    expect(result[0]!.balance).toBeCloseTo(0);
  });

  it('identifies underpaid invoices', () => {
    const invoices = [makeInvoice({ id: 'i1', total: 1000 })];
    const payments = [makePayment({ invoice_id: 'i1', amount: 500 })];
    const result = reconcilePayments(invoices, payments);
    expect(result[0]!.status).toBe('underpaid');
    expect(result[0]!.balance).toBe(500);
  });

  it('identifies overpaid invoices', () => {
    const invoices = [makeInvoice({ id: 'i1', total: 100 })];
    const payments = [makePayment({ invoice_id: 'i1', amount: 150 })];
    const result = reconcilePayments(invoices, payments);
    expect(result[0]!.status).toBe('overpaid');
    expect(result[0]!.balance).toBe(-50);
  });

  it('handles invoices with no payments', () => {
    const invoices = [makeInvoice({ id: 'i1', total: 1000 })];
    const result = reconcilePayments(invoices, []);
    expect(result[0]!.status).toBe('underpaid');
    expect(result[0]!.totalPaid).toBe(0);
    expect(result[0]!.balance).toBe(1000);
  });

  it('aggregates multiple payments per invoice', () => {
    const invoices = [makeInvoice({ id: 'i1', total: 1000 })];
    const payments = [
      makePayment({ id: 'p1', invoice_id: 'i1', amount: 300 }),
      makePayment({ id: 'p2', invoice_id: 'i1', amount: 700 }),
    ];
    const result = reconcilePayments(invoices, payments);
    expect(result[0]!.status).toBe('balanced');
  });

  it('handles empty inputs', () => {
    expect(reconcilePayments([], [])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getOutstandingBalance
// ---------------------------------------------------------------------------

describe('getOutstandingBalance', () => {
  it('sums sent and overdue invoices', () => {
    const invoices = [
      makeInvoice({ total: 1000, status: 'sent' }),
      makeInvoice({ id: 'i2', total: 500, status: 'overdue' }),
      makeInvoice({ id: 'i3', total: 200, status: 'viewed' }),
    ];
    expect(getOutstandingBalance(invoices)).toBe(1700);
  });

  it('excludes paid invoices', () => {
    const invoices = [
      makePaidInvoice({ total: 5000 }),
      makeInvoice({ total: 300, status: 'sent' }),
    ];
    expect(getOutstandingBalance(invoices)).toBe(300);
  });

  it('excludes cancelled invoices', () => {
    const invoices = [makeInvoice({ total: 1000, status: 'cancelled' })];
    expect(getOutstandingBalance(invoices)).toBe(0);
  });

  it('excludes draft invoices', () => {
    const invoices = [makeDraftInvoice({ total: 500 })];
    expect(getOutstandingBalance(invoices)).toBe(0);
  });

  it('excludes refunded invoices', () => {
    const invoices = [makeInvoice({ total: 1000, status: 'refunded' })];
    expect(getOutstandingBalance(invoices)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(getOutstandingBalance([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildAgingReport
// ---------------------------------------------------------------------------

describe('buildAgingReport', () => {
  it('puts current invoices in current bucket', () => {
    const asOf = new Date('2025-03-01');
    const invoices = [makeInvoice({ due_date: '2025-03-15', total: 500, status: 'sent' })];
    const aging = buildAgingReport(invoices, asOf);
    const current = aging.find((b) => b.bucket === 'current');
    expect(current!.count).toBe(1);
    expect(current!.total).toBe(500);
  });

  it('puts 15 days overdue in 1-30 bucket', () => {
    const asOf = new Date('2025-03-15');
    const invoices = [makeInvoice({ due_date: '2025-03-01', total: 700, status: 'sent' })];
    const aging = buildAgingReport(invoices, asOf);
    const bucket = aging.find((b) => b.bucket === '1-30');
    expect(bucket!.count).toBe(1);
    expect(bucket!.total).toBe(700);
  });

  it('puts 45 days overdue in 31-60 bucket', () => {
    const asOf = new Date('2025-04-15');
    const invoices = [makeInvoice({ due_date: '2025-03-01', total: 300, status: 'overdue' })];
    const aging = buildAgingReport(invoices, asOf);
    const bucket = aging.find((b) => b.bucket === '31-60');
    expect(bucket!.count).toBe(1);
    expect(bucket!.total).toBe(300);
  });

  it('puts 75 days overdue in 61-90 bucket', () => {
    const asOf = new Date('2025-05-15');
    const invoices = [makeInvoice({ due_date: '2025-03-01', total: 1000, status: 'overdue' })];
    const aging = buildAgingReport(invoices, asOf);
    const bucket = aging.find((b) => b.bucket === '61-90');
    expect(bucket!.count).toBe(1);
    expect(bucket!.total).toBe(1000);
  });

  it('puts 100+ days overdue in 90+ bucket', () => {
    const asOf = new Date('2025-06-15');
    const invoices = [makeInvoice({ due_date: '2025-03-01', total: 2000, status: 'overdue' })];
    const aging = buildAgingReport(invoices, asOf);
    const bucket = aging.find((b) => b.bucket === '90+');
    expect(bucket!.count).toBe(1);
    expect(bucket!.total).toBe(2000);
  });

  it('excludes paid invoices', () => {
    const asOf = new Date('2025-06-01');
    const invoices = [makePaidInvoice({ due_date: '2025-01-01' })];
    const aging = buildAgingReport(invoices, asOf);
    const totalCount = aging.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(0);
  });

  it('excludes draft invoices', () => {
    const asOf = new Date('2025-06-01');
    const invoices = [makeDraftInvoice({ due_date: '2025-01-01' })];
    const aging = buildAgingReport(invoices, asOf);
    const totalCount = aging.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(0);
  });

  it('returns all 5 buckets even when empty', () => {
    const aging = buildAgingReport([]);
    expect(aging).toHaveLength(5);
    expect(aging.map((b) => b.bucket)).toEqual(['current', '1-30', '31-60', '61-90', '90+']);
  });

  it('handles multiple invoices across buckets', () => {
    const asOf = new Date('2025-06-01');
    const invoices = [
      makeInvoice({ id: 'a', due_date: '2025-06-15', total: 100, status: 'sent' }),  // current
      makeInvoice({ id: 'b', due_date: '2025-05-20', total: 200, status: 'sent' }),  // 1-30 (12 days)
      makeInvoice({ id: 'c', due_date: '2025-04-15', total: 300, status: 'overdue' }), // 31-60 (47 days)
    ];
    const aging = buildAgingReport(invoices, asOf);
    expect(aging.find((b) => b.bucket === 'current')!.count).toBe(1);
    expect(aging.find((b) => b.bucket === '1-30')!.count).toBe(1);
    expect(aging.find((b) => b.bucket === '31-60')!.count).toBe(1);
  });
});
