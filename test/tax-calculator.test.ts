import { describe, it, expect } from 'vitest';
import {
  calculateTaxableEvents,
  calculateIncome,
  aggregateByYear,
  estimateTax,
  type YearSummary,
} from '../src/core/analysis/tax-calculator.js';
import type { Transaction, CostBasisLot } from '../src/core/types/database.js';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    tenant_id: 'tenant-1',
    wallet_id: 'wallet-1',
    tx_hash: '0xabc',
    chain: 'ethereum',
    tx_type: 'sell',
    from_address: '0xwallet',
    to_address: '0xdex',
    token_address: null,
    token_symbol: 'ETH',
    amount: 1,
    price_usd: 3000,
    value_usd: 3000,
    fee_usd: 5,
    fee_token: null,
    timestamp: '2024-06-15T12:00:00Z',
    is_classified: true,
    classification_notes: null,
    created_at: '2024-06-15T12:00:00Z',
    ...overrides,
  };
}

function makeLot(overrides: Partial<CostBasisLot> = {}): CostBasisLot {
  return {
    id: 'lot-1',
    tenant_id: 'tenant-1',
    token_symbol: 'ETH',
    chain: 'ethereum',
    amount: 5,
    cost_per_unit_usd: 2000,
    total_cost_usd: 10000,
    acquired_at: '2024-01-01T00:00:00Z',
    acquired_via: 'buy',
    remaining_amount: 5,
    is_consumed: false,
    ...overrides,
  };
}

describe('Tax Calculator', () => {
  describe('calculateTaxableEvents', () => {
    it('should create a capital gain event for a sell', () => {
      const txns = [makeTx({ id: 'sell-1', tx_type: 'sell', amount: 1, value_usd: 3000 })];
      const lots = [makeLot({ id: 'lot-1', cost_per_unit_usd: 2000, remaining_amount: 5 })];

      const events = calculateTaxableEvents(txns, lots, 'fifo', 'us');
      expect(events).toHaveLength(1);
      expect(events[0]!.event_type).toBe('capital_gain');
      expect(events[0]!.gain_loss_usd).toBe(1000); // 3000 - 2000
      expect(events[0]!.proceeds_usd).toBe(3000);
      expect(events[0]!.cost_basis_usd).toBe(2000);
    });

    it('should create a capital loss event', () => {
      const txns = [makeTx({ id: 'sell-2', tx_type: 'sell', amount: 1, value_usd: 1500 })];
      const lots = [makeLot({ id: 'lot-2', cost_per_unit_usd: 2000, remaining_amount: 5 })];

      const events = calculateTaxableEvents(txns, lots, 'fifo', 'us');
      expect(events[0]!.event_type).toBe('capital_loss');
      expect(events[0]!.gain_loss_usd).toBe(-500);
    });

    it('should process swaps as taxable events', () => {
      const txns = [makeTx({ id: 'swap-1', tx_type: 'swap', amount: 2, value_usd: 6000 })];
      const lots = [makeLot({ id: 'lot-3', cost_per_unit_usd: 2500, remaining_amount: 5 })];

      const events = calculateTaxableEvents(txns, lots, 'fifo', 'us');
      expect(events).toHaveLength(1);
      expect(events[0]!.gain_loss_usd).toBe(1000); // 6000 - 5000
    });

    it('should not create events for non-disposal types', () => {
      const txns = [makeTx({ id: 'buy-1', tx_type: 'buy' })];
      const lots = [makeLot()];

      const events = calculateTaxableEvents(txns, lots, 'fifo', 'us');
      expect(events).toHaveLength(0);
    });

    it('should track holding period and gain type', () => {
      const txns = [
        makeTx({
          id: 'sell-lt',
          tx_type: 'sell',
          amount: 1,
          value_usd: 3000,
          timestamp: '2025-06-15T12:00:00Z', // 18 months later
        }),
      ];
      const lots = [
        makeLot({
          id: 'lot-lt',
          cost_per_unit_usd: 2000,
          remaining_amount: 5,
          acquired_at: '2024-01-01T00:00:00Z',
        }),
      ];

      const events = calculateTaxableEvents(txns, lots, 'fifo', 'us');
      expect(events[0]!.gain_type).toBe('long_term');
      expect(events[0]!.holding_period_days).toBeGreaterThan(365);
    });
  });

  describe('calculateIncome', () => {
    it('should identify airdrop income', () => {
      const txns = [
        makeTx({ id: 'airdrop-1', tx_type: 'airdrop', amount: 100, value_usd: 500 }),
      ];
      const income = calculateIncome(txns);
      expect(income).toHaveLength(1);
      expect(income[0]!.incomeType).toBe('airdrop');
      expect(income[0]!.valueUsd).toBe(500);
    });

    it('should identify claim income', () => {
      const txns = [
        makeTx({ id: 'claim-1', tx_type: 'claim', amount: 50, value_usd: 250 }),
      ];
      const income = calculateIncome(txns);
      expect(income).toHaveLength(1);
      expect(income[0]!.incomeType).toBe('claim');
    });

    it('should not include sells as income', () => {
      const txns = [makeTx({ id: 'sell-x', tx_type: 'sell' })];
      const income = calculateIncome(txns);
      expect(income).toHaveLength(0);
    });
  });

  describe('aggregateByYear', () => {
    it('should aggregate events into yearly summaries', () => {
      const events = [
        { tenant_id: 't', tx_id: '1', event_type: 'capital_gain' as const, gain_type: 'short_term' as const, proceeds_usd: 5000, cost_basis_usd: 3000, gain_loss_usd: 2000, holding_period_days: 100, method: 'fifo' as const, tax_year: 2024 },
        { tenant_id: 't', tx_id: '2', event_type: 'capital_loss' as const, gain_type: 'short_term' as const, proceeds_usd: 1000, cost_basis_usd: 2000, gain_loss_usd: -1000, holding_period_days: 50, method: 'fifo' as const, tax_year: 2024 },
      ];
      const income = [
        { txId: '3', incomeType: 'staking', tokenSymbol: 'ETH', amount: 1, valueUsd: 3000, timestamp: '2024-06-01T00:00:00Z' },
      ];

      const yearly = aggregateByYear(events, income);
      const summary = yearly.get(2024);

      expect(summary).toBeDefined();
      expect(summary!.short_term_gains).toBe(2000);
      expect(summary!.total_losses).toBe(1000);
      expect(summary!.total_income).toBe(3000);
      expect(summary!.total_proceeds).toBe(6000);
    });

    it('should separate long and short term gains', () => {
      const events = [
        { tenant_id: 't', tx_id: '1', event_type: 'capital_gain' as const, gain_type: 'long_term' as const, proceeds_usd: 10000, cost_basis_usd: 3000, gain_loss_usd: 7000, holding_period_days: 400, method: 'fifo' as const, tax_year: 2024 },
        { tenant_id: 't', tx_id: '2', event_type: 'capital_gain' as const, gain_type: 'short_term' as const, proceeds_usd: 5000, cost_basis_usd: 4000, gain_loss_usd: 1000, holding_period_days: 100, method: 'fifo' as const, tax_year: 2024 },
      ];

      const yearly = aggregateByYear(events, []);
      const summary = yearly.get(2024)!;
      expect(summary.long_term_gains).toBe(7000);
      expect(summary.short_term_gains).toBe(1000);
    });
  });

  describe('estimateTax', () => {
    const baseSummary: YearSummary = {
      tax_year: 2024,
      total_proceeds: 50000,
      total_cost_basis: 30000,
      short_term_gains: 10000,
      long_term_gains: 10000,
      total_income: 5000,
      total_losses: 0,
    };

    it('should estimate US tax', () => {
      const tax = estimateTax(baseSummary, 'us');
      expect(tax).toBeGreaterThan(0);
    });

    it('should return 0 for Singapore', () => {
      const tax = estimateTax(baseSummary, 'sg');
      expect(tax).toBe(0);
    });

    it('should return 0 for UAE', () => {
      const tax = estimateTax(baseSummary, 'ae');
      expect(tax).toBe(0);
    });

    it('should calculate France flat tax', () => {
      const tax = estimateTax(baseSummary, 'fr');
      // 30% of (10000+10000+5000) = 7500
      expect(tax).toBe(7500);
    });

    it('should handle losses reducing tax', () => {
      const lossySummary = { ...baseSummary, short_term_gains: 5000, total_losses: 5000 };
      const taxNoLoss = estimateTax(baseSummary, 'us');
      const taxWithLoss = estimateTax(lossySummary, 'us');
      expect(taxWithLoss).toBeLessThan(taxNoLoss);
    });
  });
});
