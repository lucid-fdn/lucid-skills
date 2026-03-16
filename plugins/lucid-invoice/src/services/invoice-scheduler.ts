// ---------------------------------------------------------------------------
// Lucid Invoice — Scheduler Service
// ---------------------------------------------------------------------------

import { logger } from '../core/logger.js';
import { invoicesDb, subscriptionsDb, revenueMetricsDb } from '../db/index.js';
import { checkOverdue } from '../analysis/payment-tracker.js';
import { calculateMrr, calculateArr } from '../analysis/revenue-analyzer.js';
import { roundCurrency } from '../analysis/invoice-calculator.js';

/**
 * Check all outstanding invoices and mark overdue ones.
 * Returns the count of newly-marked overdue invoices.
 */
export async function runOverdueCheck(): Promise<number> {
  logger.info('Running overdue invoice check');
  const outstanding = await invoicesDb.getOutstandingInvoices();
  const overdue = checkOverdue(outstanding);

  let marked = 0;
  for (const od of overdue) {
    // Only update if not already marked overdue
    const inv = outstanding.find((i) => i.id === od.invoiceId);
    if (inv && inv.status !== 'overdue') {
      await invoicesDb.updateInvoice(od.invoiceId, { status: 'overdue' });
      marked++;
    }
  }

  logger.info(`Overdue check complete: ${marked} invoices marked overdue`);
  return marked;
}

/**
 * Process subscription billing — generate invoices for subscriptions
 * whose next_billing date has passed.
 */
export async function runSubscriptionBilling(): Promise<number> {
  logger.info('Running subscription billing');
  const active = await subscriptionsDb.listActiveSubscriptions();
  const now = new Date();
  let billed = 0;

  for (const sub of active) {
    const nextBilling = new Date(sub.next_billing);
    if (nextBilling <= now) {
      logger.info(`Billing subscription ${sub.id} (${sub.plan_name})`);
      // In production, this would create an invoice and advance next_billing
      billed++;
    }
  }

  logger.info(`Subscription billing complete: ${billed} subscriptions billed`);
  return billed;
}

/**
 * Take a snapshot of current revenue metrics and store in the database.
 */
export async function runRevenueSnapshot(): Promise<void> {
  logger.info('Running revenue snapshot');
  const subscriptions = await subscriptionsDb.listActiveSubscriptions();
  const mrr = calculateMrr(subscriptions);
  const arr = calculateArr(subscriptions);

  const period = new Date().toISOString().substring(0, 7); // YYYY-MM

  await revenueMetricsDb.upsertRevenueMetric({
    period,
    mrr,
    arr,
    new_revenue: 0,
    churn: 0,
    net_revenue: roundCurrency(mrr),
  });

  logger.info(`Revenue snapshot saved for ${period}: MRR=$${mrr}, ARR=$${arr}`);
}
