import { describe, it, expect } from 'vitest';
import {
  calculateFifo,
  calculateLifo,
  calculateHifo,
  calculateAcb,
  calculateCostBasis,
  getHoldingPeriod,
  classifyGainType,
} from '../src/core/analysis/cost-basis-calculator.js';
import type { CostBasisLot } from '../src/core/types/database.js';

function makeLot(overrides: Partial<CostBasisLot> = {}): CostBasisLot {
  return {
    id: overrides.id ?? 'lot-1',
    tenant_id: 'tenant-1',
    token_symbol: 'ETH',
    chain: 'ethereum',
    amount: 1,
    cost_per_unit_usd: 1000,
    total_cost_usd: 1000,
    acquired_at: '2024-01-01T00:00:00Z',
    acquired_via: 'buy',
    remaining_amount: 1,
    is_consumed: false,
    ...overrides,
  };
}

const sampleLots: CostBasisLot[] = [
  makeLot({ id: 'lot-a', cost_per_unit_usd: 1000, remaining_amount: 2, acquired_at: '2024-01-01T00:00:00Z' }),
  makeLot({ id: 'lot-b', cost_per_unit_usd: 2000, remaining_amount: 3, acquired_at: '2024-03-01T00:00:00Z' }),
  makeLot({ id: 'lot-c', cost_per_unit_usd: 1500, remaining_amount: 1, acquired_at: '2024-02-01T00:00:00Z' }),
];

describe('Cost Basis Calculator', () => {
  describe('FIFO', () => {
    it('should consume oldest lots first', () => {
      const consumed = calculateFifo(sampleLots, 3);
      expect(consumed).toHaveLength(2);
      expect(consumed[0]!.lotId).toBe('lot-a'); // oldest
      expect(consumed[0]!.amountUsed).toBe(2);
      expect(consumed[1]!.lotId).toBe('lot-c'); // second oldest
      expect(consumed[1]!.amountUsed).toBe(1);
    });

    it('should partially consume a lot', () => {
      const consumed = calculateFifo(sampleLots, 1);
      expect(consumed).toHaveLength(1);
      expect(consumed[0]!.lotId).toBe('lot-a');
      expect(consumed[0]!.amountUsed).toBe(1);
      expect(consumed[0]!.costBasis).toBe(1000);
    });

    it('should handle zero sale amount', () => {
      const consumed = calculateFifo(sampleLots, 0);
      expect(consumed).toHaveLength(0);
    });

    it('should handle empty lots', () => {
      const consumed = calculateFifo([], 5);
      expect(consumed).toHaveLength(0);
    });
  });

  describe('LIFO', () => {
    it('should consume newest lots first', () => {
      const consumed = calculateLifo(sampleLots, 3);
      // lot-b is newest (2024-03-01) with remaining_amount=3, covers entire sale
      expect(consumed).toHaveLength(1);
      expect(consumed[0]!.lotId).toBe('lot-b'); // newest
      expect(consumed[0]!.amountUsed).toBe(3);
    });

    it('should calculate correct cost basis for newest lot', () => {
      const consumed = calculateLifo(sampleLots, 1);
      expect(consumed[0]!.costBasis).toBe(2000); // $2000/unit
    });
  });

  describe('HIFO', () => {
    it('should consume highest cost lots first', () => {
      // lot-b ($2000/unit, remaining=3) covers the full sale of 3
      const consumed = calculateHifo(sampleLots, 3);
      expect(consumed).toHaveLength(1);
      expect(consumed[0]!.lotId).toBe('lot-b'); // $2000/unit, has 3 remaining

      // Selling 4 requires two lots
      const consumed4 = calculateHifo(sampleLots, 4);
      expect(consumed4).toHaveLength(2);
      expect(consumed4[0]!.lotId).toBe('lot-b'); // $2000/unit
      expect(consumed4[1]!.lotId).toBe('lot-c'); // $1500/unit
    });

    it('should maximize cost basis', () => {
      const consumed = calculateHifo(sampleLots, 4);
      const totalCost = consumed.reduce((s, c) => s + c.costBasis, 0);
      // 3 @ $2000 + 1 @ $1500 = $7500
      expect(totalCost).toBe(7500);
    });
  });

  describe('ACB (Average Cost)', () => {
    it('should apply weighted average cost', () => {
      const consumed = calculateAcb(sampleLots, 1);
      // Total: 2*1000 + 3*2000 + 1*1500 = 9500. Total units = 6.
      // Avg = 9500/6 ≈ 1583.33
      const avgCost = 9500 / 6;
      expect(consumed[0]!.costBasis).toBeCloseTo(avgCost, 2);
    });

    it('should handle all lots consumed', () => {
      const consumed = calculateAcb(sampleLots, 6);
      const totalCost = consumed.reduce((s, c) => s + c.costBasis, 0);
      expect(totalCost).toBeCloseTo(9500, 2);
    });
  });

  describe('calculateCostBasis', () => {
    it('should compute gain correctly', () => {
      const result = calculateCostBasis(sampleLots, 2, 5000, 'fifo');
      expect(result.proceeds).toBe(5000);
      expect(result.cost_basis).toBe(2000); // 2 @ $1000
      expect(result.gain_loss).toBe(3000);
    });

    it('should compute loss correctly', () => {
      const result = calculateCostBasis(sampleLots, 3, 2000, 'hifo');
      // HIFO: 3 @ $2000 = $6000 cost basis
      expect(result.cost_basis).toBe(6000);
      expect(result.gain_loss).toBe(-4000);
    });

    it('should handle specific_id as FIFO default', () => {
      const result = calculateCostBasis(sampleLots, 1, 1500, 'specific_id');
      expect(result.cost_basis).toBe(1000); // FIFO fallback
    });
  });

  describe('getHoldingPeriod', () => {
    it('should calculate days between dates', () => {
      const days = getHoldingPeriod('2024-01-01', '2024-07-01');
      expect(days).toBe(182);
    });

    it('should return 0 for same day', () => {
      const days = getHoldingPeriod('2024-01-01', '2024-01-01');
      expect(days).toBe(0);
    });

    it('should return 365 for full year', () => {
      const days = getHoldingPeriod('2024-01-01', '2025-01-01');
      expect(days).toBe(366); // 2024 is a leap year
    });
  });

  describe('classifyGainType', () => {
    it('should classify as short_term under 365 days (US)', () => {
      expect(classifyGainType(100, 'us')).toBe('short_term');
      expect(classifyGainType(365, 'us')).toBe('short_term');
    });

    it('should classify as long_term over 365 days (US)', () => {
      expect(classifyGainType(366, 'us')).toBe('long_term');
      expect(classifyGainType(730, 'us')).toBe('long_term');
    });

    it('should always return short_term for UK', () => {
      expect(classifyGainType(1000, 'uk')).toBe('short_term');
    });

    it('should always return short_term for Singapore/UAE', () => {
      expect(classifyGainType(1000, 'sg')).toBe('short_term');
      expect(classifyGainType(1000, 'ae')).toBe('short_term');
    });

    it('should classify long_term for Australia >365 days', () => {
      expect(classifyGainType(366, 'au')).toBe('long_term');
      expect(classifyGainType(100, 'au')).toBe('short_term');
    });
  });
});
