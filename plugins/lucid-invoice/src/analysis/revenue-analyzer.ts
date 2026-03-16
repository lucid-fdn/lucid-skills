// ---------------------------------------------------------------------------
// Lucid Invoice — Revenue Analyzer
// ---------------------------------------------------------------------------

import type { SubscriptionRow } from '../types/database.js';
import type { InvoiceRow } from '../types/database.js';
import type { BillingCycle } from '../types/common.js';
import { roundCurrency } from './invoice-calculator.js';

/** Multiplier to annualise a billing cycle amount. */
const CYCLE_TO_MONTHLY: Record<BillingCycle, number> = {
  one_time: 0,
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  annual: 1 / 12,
};

/**
 * Calculate Monthly Recurring Revenue from active subscriptions.
 */
export function calculateMrr(subscriptions: SubscriptionRow[]): number {
  const active = subscriptions.filter((s) => s.status === 'active');
  const total = active.reduce((sum, s) => {
    const multiplier = CYCLE_TO_MONTHLY[s.cycle] ?? 0;
    return sum + s.amount * multiplier;
  }, 0);
  return roundCurrency(total);
}

/**
 * Calculate Annual Recurring Revenue (MRR * 12).
 */
export function calculateArr(subscriptions: SubscriptionRow[]): number {
  return roundCurrency(calculateMrr(subscriptions) * 12);
}

/**
 * Calculate churn rate over a period.
 * churn = lost_subscriptions / total_at_start * 100
 */
export function calculateChurnRate(
  startCount: number,
  lostCount: number,
): number {
  if (startCount <= 0) return 0;
  return roundCurrency((lostCount / startCount) * 100);
}

/**
 * Project revenue for the next N months based on current MRR and growth rate.
 */
export function projectRevenue(
  currentMrr: number,
  months: number,
  monthlyGrowthRate = 0,
): Array<{ month: number; projected: number }> {
  const projections: Array<{ month: number; projected: number }> = [];
  let mrr = currentMrr;
  for (let i = 1; i <= months; i++) {
    mrr = roundCurrency(mrr * (1 + monthlyGrowthRate / 100));
    projections.push({ month: i, projected: mrr });
  }
  return projections;
}

/**
 * Revenue breakdown by client from paid invoices.
 */
export function revenueByClient(
  invoices: InvoiceRow[],
): Array<{ clientId: string; total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const inv of invoices) {
    if (inv.status !== 'paid') continue;
    const entry = map.get(inv.client_id) ?? { total: 0, count: 0 };
    entry.total = roundCurrency(entry.total + inv.total);
    entry.count += 1;
    map.set(inv.client_id, entry);
  }
  return Array.from(map.entries())
    .map(([clientId, data]) => ({ clientId, ...data }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Revenue breakdown by period (YYYY-MM) from paid invoices.
 */
export function revenueByPeriod(
  invoices: InvoiceRow[],
): Array<{ period: string; total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const inv of invoices) {
    if (inv.status !== 'paid') continue;
    const period = inv.paid_at
      ? inv.paid_at.substring(0, 7)
      : inv.issue_date.substring(0, 7);
    const entry = map.get(period) ?? { total: 0, count: 0 };
    entry.total = roundCurrency(entry.total + inv.total);
    entry.count += 1;
    map.set(period, entry);
  }
  return Array.from(map.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => a.period.localeCompare(b.period));
}
