import { describe, it, expect } from 'vitest';
import {
  buildPositions,
  findHarvestingOpportunities,
  calculateWashSaleRisk,
  estimateTaxSavings,
  type HoldingPosition,
  type HarvestOpportunity,
} from '../src/core/analysis/tax-loss-harvester.js';
import type { CostBasisLot, Transaction } from '../src/core/types/database.js';

function makeLot(overrides: Partial<CostBasisLot> = {}): CostBasisLot {
  return {
    id: 'lot-1',
    tenant_id: 'tenant-1',
    token_symbol: 'ETH',
    chain: 'ethereum',
    amount: 10,
    cost_per_unit_usd: 3000,
    total_cost_usd: 30000,
    acquired_at: '2024-01-01T00:00:00Z',
    acquired_via: 'buy',
    remaining_amount: 10,
    is_consumed: false,
    ...overrides,
  };
}

function makeTrade(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    tenant_id: 'tenant-1',
    wallet_id: 'wallet-1',
    tx_hash: '0xhash',
    chain: 'ethereum',
    tx_type: 'buy',
    from_address: '0xfrom',
    to_address: '0xto',
    token_address: null,
    token_symbol: 'ETH',
    amount: 1,
    price_usd: 3000,
    value_usd: 3000,
    fee_usd: 5,
    fee_token: null,
    timestamp: new Date().toISOString(),
    is_classified: true,
    classification_notes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Tax Loss Harvester', () => {
  describe('buildPositions', () => {
    it('should aggregate lots into positions', () => {
      const lots = [
        makeLot({ id: 'a', token_symbol: 'ETH', remaining_amount: 5, cost_per_unit_usd: 2000 }),
        makeLot({ id: 'b', token_symbol: 'ETH', remaining_amount: 3, cost_per_unit_usd: 3000 }),
        makeLot({ id: 'c', token_symbol: 'BTC', remaining_amount: 1, cost_per_unit_usd: 50000 }),
      ];

      const positions = buildPositions(lots);
      expect(positions).toHaveLength(2);

      const eth = positions.find((p) => p.tokenSymbol === 'ETH')!;
      expect(eth.totalAmount).toBe(8);
      expect(eth.totalCostBasis).toBe(19000); // 5*2000 + 3*3000
      expect(eth.avgCostPerUnit).toBeCloseTo(2375, 0);
    });

    it('should exclude consumed lots', () => {
      const lots = [
        makeLot({ id: 'a', remaining_amount: 5 }),
        makeLot({ id: 'b', remaining_amount: 0 }),
      ];
      const positions = buildPositions(lots);
      expect(positions[0]!.totalAmount).toBe(5);
    });
  });

  describe('findHarvestingOpportunities', () => {
    it('should find tokens below cost basis', () => {
      const holdings: HoldingPosition[] = [
        { tokenSymbol: 'ETH', totalAmount: 10, avgCostPerUnit: 3000, totalCostBasis: 30000 },
        { tokenSymbol: 'BTC', totalAmount: 1, avgCostPerUnit: 60000, totalCostBasis: 60000 },
      ];
      const prices = { ETH: 2000, BTC: 70000 };

      const opportunities = findHarvestingOpportunities(holdings, prices);
      expect(opportunities).toHaveLength(1);
      expect(opportunities[0]!.tokenSymbol).toBe('ETH');
      expect(opportunities[0]!.unrealizedLoss).toBe(-10000);
    });

    it('should respect minimum loss threshold', () => {
      const holdings: HoldingPosition[] = [
        { tokenSymbol: 'ETH', totalAmount: 1, avgCostPerUnit: 3000, totalCostBasis: 3000 },
      ];
      const prices = { ETH: 2900 }; // only $100 loss

      const noMin = findHarvestingOpportunities(holdings, prices, 0);
      expect(noMin).toHaveLength(1);

      const highMin = findHarvestingOpportunities(holdings, prices, 500);
      expect(highMin).toHaveLength(0);
    });

    it('should sort by largest loss first', () => {
      const holdings: HoldingPosition[] = [
        { tokenSymbol: 'ETH', totalAmount: 1, avgCostPerUnit: 3000, totalCostBasis: 3000 },
        { tokenSymbol: 'SOL', totalAmount: 100, avgCostPerUnit: 200, totalCostBasis: 20000 },
      ];
      const prices = { ETH: 2500, SOL: 100 }; // ETH loss=$500, SOL loss=$10000

      const opportunities = findHarvestingOpportunities(holdings, prices);
      expect(opportunities[0]!.tokenSymbol).toBe('SOL'); // larger loss first
    });

    it('should skip tokens with gains', () => {
      const holdings: HoldingPosition[] = [
        { tokenSymbol: 'BTC', totalAmount: 1, avgCostPerUnit: 50000, totalCostBasis: 50000 },
      ];
      const prices = { BTC: 60000 };

      const opportunities = findHarvestingOpportunities(holdings, prices);
      expect(opportunities).toHaveLength(0);
    });
  });

  describe('calculateWashSaleRisk', () => {
    it('should detect wash sale risk within 30 days', () => {
      const now = new Date('2024-06-15');
      const trades = [
        makeTrade({
          token_symbol: 'ETH',
          tx_type: 'buy',
          timestamp: '2024-06-01T12:00:00Z',
        }),
      ];
      expect(calculateWashSaleRisk(trades, 'ETH', now)).toBe(true);
    });

    it('should not flag trades outside 30-day window', () => {
      const now = new Date('2024-06-15');
      const trades = [
        makeTrade({
          token_symbol: 'ETH',
          tx_type: 'buy',
          timestamp: '2024-03-01T12:00:00Z',
        }),
      ];
      expect(calculateWashSaleRisk(trades, 'ETH', now)).toBe(false);
    });

    it('should not flag sells (only buys create wash sale)', () => {
      const now = new Date('2024-06-15');
      const trades = [
        makeTrade({
          token_symbol: 'ETH',
          tx_type: 'sell',
          timestamp: '2024-06-10T12:00:00Z',
        }),
      ];
      expect(calculateWashSaleRisk(trades, 'ETH', now)).toBe(false);
    });
  });

  describe('estimateTaxSavings', () => {
    it('should calculate savings from opportunities', () => {
      const opportunities: HarvestOpportunity[] = [
        {
          tokenSymbol: 'ETH',
          amount: 10,
          costBasis: 30000,
          currentValue: 20000,
          unrealizedLoss: -10000,
          lossPercentage: -33.3,
          washSaleRisk: false,
        },
      ];
      const savings = estimateTaxSavings(opportunities, 0.25);
      expect(savings).toBe(2500); // 10000 * 0.25
    });

    it('should sum multiple opportunities', () => {
      const opportunities: HarvestOpportunity[] = [
        {
          tokenSymbol: 'ETH',
          amount: 5,
          costBasis: 15000,
          currentValue: 10000,
          unrealizedLoss: -5000,
          lossPercentage: -33.3,
          washSaleRisk: false,
        },
        {
          tokenSymbol: 'SOL',
          amount: 100,
          costBasis: 20000,
          currentValue: 15000,
          unrealizedLoss: -5000,
          lossPercentage: -25,
          washSaleRisk: false,
        },
      ];
      const savings = estimateTaxSavings(opportunities, 0.30);
      expect(savings).toBe(3000); // (5000+5000) * 0.30
    });
  });
});
