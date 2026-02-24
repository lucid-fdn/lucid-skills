// ---------------------------------------------------------------------------
// Lucid Invoice — Payment Tracker
// ---------------------------------------------------------------------------

import type { InvoiceRow, PaymentRow } from '../types/database.js';
import type { PaymentMethod, AgingBucket } from '../types/common.js';
import { ValidationError } from '../core/errors.js';
import { roundCurrency } from './invoice-calculator.js';

export interface PaymentRecord {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  receivedAt: string;
}

export interface OverdueInvoice {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  total: number;
  dueDate: string;
  daysOverdue: number;
}

export interface AgingEntry {
  bucket: AgingBucket;
  count: number;
  total: number;
}

/**
 * Validate and prepare a payment record.
 */
export function trackPayment(
  invoiceTotal: number,
  existingPayments: number,
  amount: number,
  method: PaymentMethod,
  reference: string | null = null,
): PaymentRecord & { remainingBalance: number; fullyPaid: boolean } {
  if (amount <= 0) throw new ValidationError('Payment amount must be positive');

  const remainingBefore = roundCurrency(invoiceTotal - existingPayments);
  if (amount > remainingBefore + 0.01) {
    throw new ValidationError(
      `Payment of ${amount} exceeds remaining balance of ${remainingBefore}`,
    );
  }

  const remainingBalance = roundCurrency(remainingBefore - amount);
  return {
    invoiceId: '', // caller fills this
    amount: roundCurrency(amount),
    method,
    reference,
    receivedAt: new Date().toISOString(),
    remainingBalance,
    fullyPaid: remainingBalance <= 0.005,
  };
}

/**
 * Check which invoices are overdue.
 */
export function checkOverdue(
  invoices: InvoiceRow[],
  asOf: Date = new Date(),
): OverdueInvoice[] {
  const result: OverdueInvoice[] = [];
  for (const inv of invoices) {
    if (inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'refunded' || inv.status === 'draft') {
      continue;
    }
    const dueDate = new Date(inv.due_date);
    if (dueDate < asOf) {
      const diffMs = asOf.getTime() - dueDate.getTime();
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      result.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        clientId: inv.client_id,
        total: inv.total,
        dueDate: inv.due_date,
        daysOverdue,
      });
    }
  }
  return result.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Build a reminder message for an overdue invoice.
 */
export function sendReminder(invoice: OverdueInvoice, companyName: string): string {
  return [
    `Reminder: Invoice ${invoice.invoiceNumber} from ${companyName}`,
    `Amount due: $${invoice.total.toFixed(2)}`,
    `Due date: ${invoice.dueDate}`,
    `Days overdue: ${invoice.daysOverdue}`,
    `Please remit payment at your earliest convenience.`,
  ].join('\n');
}

/**
 * Reconcile payments against invoices — find discrepancies.
 */
export function reconcilePayments(
  invoices: InvoiceRow[],
  payments: PaymentRow[],
): Array<{
  invoiceId: string;
  invoiceTotal: number;
  totalPaid: number;
  balance: number;
  status: 'balanced' | 'underpaid' | 'overpaid';
}> {
  const paymentMap = new Map<string, number>();
  for (const p of payments) {
    paymentMap.set(p.invoice_id, (paymentMap.get(p.invoice_id) ?? 0) + p.amount);
  }

  return invoices.map((inv) => {
    const totalPaid = roundCurrency(paymentMap.get(inv.id) ?? 0);
    const balance = roundCurrency(inv.total - totalPaid);
    let status: 'balanced' | 'underpaid' | 'overpaid';
    if (Math.abs(balance) < 0.01) status = 'balanced';
    else if (balance > 0) status = 'underpaid';
    else status = 'overpaid';
    return { invoiceId: inv.id, invoiceTotal: inv.total, totalPaid, balance, status };
  });
}

/**
 * Get outstanding (unpaid) balance, optionally filtered by client.
 */
export function getOutstandingBalance(invoices: InvoiceRow[]): number {
  return roundCurrency(
    invoices
      .filter((i) => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'refunded' && i.status !== 'draft')
      .reduce((sum, i) => sum + i.total, 0),
  );
}

/**
 * Build an accounts receivable aging report.
 */
export function buildAgingReport(
  invoices: InvoiceRow[],
  asOf: Date = new Date(),
): AgingEntry[] {
  const buckets: Record<AgingBucket, { count: number; total: number }> = {
    current: { count: 0, total: 0 },
    '1-30': { count: 0, total: 0 },
    '31-60': { count: 0, total: 0 },
    '61-90': { count: 0, total: 0 },
    '90+': { count: 0, total: 0 },
  };

  for (const inv of invoices) {
    if (inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'refunded' || inv.status === 'draft') {
      continue;
    }
    const dueDate = new Date(inv.due_date);
    const diffDays = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    let bucket: AgingBucket;
    if (diffDays <= 0) bucket = 'current';
    else if (diffDays <= 30) bucket = '1-30';
    else if (diffDays <= 60) bucket = '31-60';
    else if (diffDays <= 90) bucket = '61-90';
    else bucket = '90+';

    buckets[bucket].count += 1;
    buckets[bucket].total = roundCurrency(buckets[bucket].total + inv.total);
  }

  return (Object.entries(buckets) as Array<[AgingBucket, { count: number; total: number }]>).map(
    ([bucket, data]) => ({ bucket, ...data }),
  );
}
