// ---------------------------------------------------------------------------
// revenue-analyzer.test.ts -- Tests for revenue analytics
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  calculateMrr,
  calculateArr,
  calculateChurnRate,
  projectRevenue,
  revenueByClient,
  revenueByPeriod,
} from '../../src/analysis/revenue-analyzer.js';
import {
  makeSubscription,
  makeAnnualSubscription,
  makeWeeklySubscription,
  makeQuarterlySubscription,
  makePaidInvoice,
  makeInvoice,
} from '../helpers/fixtures.js';

// ---------------------------------------------------------------------------
// calculateMrr
// ---------------------------------------------------------------------------

describe('calculateMrr', () => {
  it('calculates MRR for monthly subscription', () => {
    const subs = [makeSubscription({ amount: 100, cycle: 'monthly', status: 'active' })];
    expect(calculateMrr(subs)).toBe(100);
  });

  it('calculates MRR for annual subscription', () => {
    const subs = [makeAnnualSubscription({ amount: 1200, status: 'active' })];
    expect(calculateMrr(subs)).toBe(100);
  });

  it('calculates MRR for weekly subscription', () => {
    const subs = [makeWeeklySubscription({ amount: 25, status: 'active' })];
    // 25 * (52/12) = 108.33
    const mrr = calculateMrr(subs);
    expect(mrr).toBeCloseTo(108.33, 1);
  });

  it('calculates MRR for quarterly subscription', () => {
    const subs = [makeQuarterlySubscription({ amount: 300, status: 'active' })];
    // 300 * (1/3) = 100
    expect(calculateMrr(subs)).toBe(100);
  });

  it('excludes one_time subscriptions from MRR', () => {
    const subs = [makeSubscription({ amount: 500, cycle: 'one_time', status: 'active' })];
    expect(calculateMrr(subs)).toBe(0);
  });

  it('excludes cancelled subscriptions', () => {
    const subs = [makeSubscription({ amount: 100, cycle: 'monthly', status: 'cancelled' })];
    expect(calculateMrr(subs)).toBe(0);
  });

  it('excludes paused subscriptions', () => {
    const subs = [makeSubscription({ amount: 100, cycle: 'monthly', status: 'paused' })];
    expect(calculateMrr(subs)).toBe(0);
  });

  it('sums multiple active subscriptions', () => {
    const subs = [
      makeSubscription({ id: 's1', amount: 100, cycle: 'monthly', status: 'active' }),
      makeSubscription({ id: 's2', amount: 200, cycle: 'monthly', status: 'active' }),
      makeSubscription({ id: 's3', amount: 50, cycle: 'monthly', status: 'cancelled' }),
    ];
    expect(calculateMrr(subs)).toBe(300);
  });

  it('returns 0 for empty array', () => {
    expect(calculateMrr([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateArr
// ---------------------------------------------------------------------------

describe('calculateArr', () => {
  it('is MRR * 12', () => {
    const subs = [makeSubscription({ amount: 100, cycle: 'monthly', status: 'active' })];
    expect(calculateArr(subs)).toBe(1200);
  });

  it('returns 0 for no active subs', () => {
    expect(calculateArr([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateChurnRate
// ---------------------------------------------------------------------------

describe('calculateChurnRate', () => {
  it('calculates churn percentage', () => {
    expect(calculateChurnRate(100, 5)).toBe(5);
  });

  it('returns 0 when start count is 0', () => {
    expect(calculateChurnRate(0, 5)).toBe(0);
  });

  it('returns 0 when no churn', () => {
    expect(calculateChurnRate(100, 0)).toBe(0);
  });

  it('handles 100% churn', () => {
    expect(calculateChurnRate(50, 50)).toBe(100);
  });

  it('handles fractional churn', () => {
    const rate = calculateChurnRate(300, 7);
    expect(rate).toBeCloseTo(2.33, 1);
  });

  it('returns 0 for negative start count', () => {
    expect(calculateChurnRate(-10, 5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// projectRevenue
// ---------------------------------------------------------------------------

describe('projectRevenue', () => {
  it('projects flat revenue with 0% growth', () => {
    const projections = projectRevenue(1000, 3, 0);
    expect(projections).toHaveLength(3);
    expect(projections[0]!.projected).toBe(1000);
    expect(projections[1]!.projected).toBe(1000);
    expect(projections[2]!.projected).toBe(1000);
  });

  it('projects growth correctly', () => {
    const projections = projectRevenue(1000, 2, 10);
    expect(projections[0]!.projected).toBe(1100); // 1000 * 1.10
    expect(projections[1]!.projected).toBe(1210); // 1100 * 1.10
  });

  it('returns correct month numbers', () => {
    const projections = projectRevenue(100, 3, 0);
    expect(projections[0]!.month).toBe(1);
    expect(projections[1]!.month).toBe(2);
    expect(projections[2]!.month).toBe(3);
  });

  it('handles single month', () => {
    const projections = projectRevenue(500, 1, 5);
    expect(projections).toHaveLength(1);
    expect(projections[0]!.projected).toBe(525);
  });

  it('defaults growth rate to 0', () => {
    const projections = projectRevenue(100, 2);
    expect(projections[0]!.projected).toBe(100);
    expect(projections[1]!.projected).toBe(100);
  });

  it('handles negative growth (decline)', () => {
    const projections = projectRevenue(1000, 2, -10);
    expect(projections[0]!.projected).toBe(900);
    expect(projections[1]!.projected).toBe(810);
  });
});

// ---------------------------------------------------------------------------
// revenueByClient
// ---------------------------------------------------------------------------

describe('revenueByClient', () => {
  it('aggregates revenue by client for paid invoices', () => {
    const invoices = [
      makePaidInvoice({ client_id: 'c1', total: 1000 }),
      makePaidInvoice({ id: 'inv-x', client_id: 'c1', total: 500 }),
      makePaidInvoice({ id: 'inv-y', client_id: 'c2', total: 2000 }),
    ];
    const result = revenueByClient(invoices);
    expect(result).toHaveLength(2);
    // Sorted by total descending
    expect(result[0]!.clientId).toBe('c2');
    expect(result[0]!.total).toBe(2000);
    expect(result[0]!.count).toBe(1);
    expect(result[1]!.clientId).toBe('c1');
    expect(result[1]!.total).toBe(1500);
    expect(result[1]!.count).toBe(2);
  });

  it('excludes non-paid invoices', () => {
    const invoices = [
      makeInvoice({ client_id: 'c1', total: 1000, status: 'sent' }),
      makePaidInvoice({ client_id: 'c1', total: 500 }),
    ];
    const result = revenueByClient(invoices);
    expect(result).toHaveLength(1);
    expect(result[0]!.total).toBe(500);
  });

  it('returns empty for no paid invoices', () => {
    const invoices = [makeInvoice({ status: 'draft' })];
    expect(revenueByClient(invoices)).toHaveLength(0);
  });

  it('returns empty for empty input', () => {
    expect(revenueByClient([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// revenueByPeriod
// ---------------------------------------------------------------------------

describe('revenueByPeriod', () => {
  it('aggregates by YYYY-MM from paid_at', () => {
    const invoices = [
      makePaidInvoice({ paid_at: '2025-01-15T00:00:00Z', total: 1000 }),
      makePaidInvoice({ id: 'inv-x', paid_at: '2025-01-20T00:00:00Z', total: 500 }),
      makePaidInvoice({ id: 'inv-y', paid_at: '2025-02-05T00:00:00Z', total: 2000 }),
    ];
    const result = revenueByPeriod(invoices);
    expect(result).toHaveLength(2);
    // Sorted by period ascending
    expect(result[0]!.period).toBe('2025-01');
    expect(result[0]!.total).toBe(1500);
    expect(result[0]!.count).toBe(2);
    expect(result[1]!.period).toBe('2025-02');
    expect(result[1]!.total).toBe(2000);
  });

  it('falls back to issue_date when paid_at is null', () => {
    const invoices = [
      makePaidInvoice({ paid_at: null, issue_date: '2025-03-01', total: 750 }),
    ];
    const result = revenueByPeriod(invoices);
    expect(result[0]!.period).toBe('2025-03');
  });

  it('returns empty for no paid invoices', () => {
    expect(revenueByPeriod([makeInvoice({ status: 'sent' })])).toHaveLength(0);
  });

  it('returns empty for empty input', () => {
    expect(revenueByPeriod([])).toHaveLength(0);
  });
});
