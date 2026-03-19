import { describe, it, expect } from 'vitest';
import {
  runTaxAnalysis,
  runMethodComparison,
  runHarvestingAnalysis,
  runWalletHealth,
} from '../../src/brain/analysis.js';
import type { Transaction, CostBasisLot } from '../../src/core/types/database.js';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests: runTaxAnalysis
// ---------------------------------------------------------------------------

describe('runTaxAnalysis', () => {
  it('should produce a valid TaxAnalysisResult with correct schema version', () => {
    const txns = [makeTx({ id: 'sell-1', tx_type: 'sell', amount: 1, value_usd: 3000 })];
    const lots = [makeLot({ id: 'lot-1', cost_per_unit_usd: 2000, remaining_amount: 5 })];

    const result = runTaxAnalysis({
      transactions: txns,
      lots,
      taxYear: 2024,
      jurisdiction: 'us',
      method: 'fifo',
      walletCount: 1,
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.taxYear).toBe(2024);
    expect(result.jurisdiction).toBe('us');
    expect(result.provenance.tool).toBe('lucid_tax_analyze');
    expect(result.provenance.version).toBe('1.0.0');
  });

  it('should calculate correct summary values for a gain', () => {
    const txns = [makeTx({ id: 'sell-1', tx_type: 'sell', amount: 1, value_usd: 3000 })];
    const lots = [makeLot({ id: 'lot-1', cost_per_unit_usd: 2000, remaining_amount: 5 })];

    const result = runTaxAnalysis({
      transactions: txns,
      lots,
      taxYear: 2024,
      jurisdiction: 'us',
      method: 'fifo',
    });

    expect(result.summary.totalProceeds).toBe(3000);
    expect(result.summary.totalCostBasis).toBe(2000);
    expect(result.summary.estimatedTax).toBeGreaterThan(0);
  });

  it('should return COMPLIANT verdict when data is clean and no savings', () => {
    // Single transaction, all classified, no optimization possible
    const txns = [makeTx({ id: 'sell-1', tx_type: 'sell', amount: 1, value_usd: 2000 })];
    const lots = [makeLot({ id: 'lot-1', cost_per_unit_usd: 2000, remaining_amount: 5 })];

    const result = runTaxAnalysis({
      transactions: txns,
      lots,
      taxYear: 2024,
      jurisdiction: 'us',
      method: 'fifo',
      walletCount: 1,
    });

    // Net gain is 0, so no optimization savings -> COMPLIANT
    expect(result.verdict).toBe('COMPLIANT');
  });

  it('should return ACTION_NEEDED when many unclassified transactions', () => {
    const txns: Transaction[] = [];
    // Create 10 unclassified transactions
    for (let i = 0; i < 10; i++) {
      txns.push(makeTx({ id: `tx-${i}`, is_classified: false }));
    }
    const lots = [makeLot()];

    const result = runTaxAnalysis({
      transactions: txns,
      lots,
      taxYear: 2024,
      jurisdiction: 'us',
      method: 'fifo',
      walletCount: 1,
    });

    expect(result.verdict).toBe('ACTION_NEEDED');
  });

  it('should return AUDIT_RISK with high value + unclassified transactions', () => {
    const txns: Transaction[] = [];
    // 15 unclassified transactions
    for (let i = 0; i < 15; i++) {
      txns.push(makeTx({ id: `tx-${i}`, is_classified: false }));
    }
    // 3 high-value transactions
    for (let i = 0; i < 3; i++) {
      txns.push(makeTx({
        id: `hv-${i}`,
        value_usd: 200_000,
        is_classified: true,
      }));
    }
    const lots = [makeLot()];

    const result = runTaxAnalysis({
      transactions: txns,
      lots,
      taxYear: 2024,
      jurisdiction: 'us',
      method: 'fifo',
      walletCount: 1,
    });

    expect(result.verdict).toBe('AUDIT_RISK');
  });

  it('should include risk factors for missing data', () => {
    const txns = [
      makeTx({ id: 'tx-1', price_usd: 0, value_usd: 0 }),
      makeTx({ id: 'tx-2', is_classified: false }),
    ];
    const lots = [makeLot()];

    const result = runTaxAnalysis({
      transactions: txns,
      lots,
      taxYear: 2024,
      jurisdiction: 'us',
      method: 'fifo',
      walletCount: 0,
    });

    expect(result.riskFactors.length).toBeGreaterThan(0);
    expect(result.riskFactors.some((r) => r.includes('unclassified'))).toBe(true);
    expect(result.riskFactors.some((r) => r.includes('missing price'))).toBe(true);
    expect(result.riskFactors.some((r) => r.includes('No wallets'))).toBe(true);
  });

  it('should handle zero-gains Singapore jurisdiction', () => {
    const txns = [makeTx({ id: 'sell-1', tx_type: 'sell', amount: 1, value_usd: 5000 })];
    const lots = [makeLot({ id: 'lot-1', cost_per_unit_usd: 2000, remaining_amount: 5 })];

    const result = runTaxAnalysis({
      transactions: txns,
      lots,
      taxYear: 2024,
      jurisdiction: 'sg',
      method: 'fifo',
      walletCount: 1,
    });

    expect(result.summary.estimatedTax).toBe(0);
    expect(result.summary.effectiveRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: runMethodComparison
// ---------------------------------------------------------------------------

describe('runMethodComparison', () => {
  it('should compare all 4 methods and find best/worst', () => {
    const txns = [
      makeTx({ id: 'sell-1', tx_type: 'sell', amount: 2, value_usd: 8000 }),
    ];
    // Multiple lots at different prices for method differences to matter
    const lots = [
      makeLot({ id: 'lot-1', cost_per_unit_usd: 1000, remaining_amount: 2, acquired_at: '2024-01-01T00:00:00Z' }),
      makeLot({ id: 'lot-2', cost_per_unit_usd: 3000, remaining_amount: 2, acquired_at: '2024-03-01T00:00:00Z' }),
      makeLot({ id: 'lot-3', cost_per_unit_usd: 5000, remaining_amount: 2, acquired_at: '2024-02-01T00:00:00Z' }),
    ];

    const result = runMethodComparison({
      transactions: txns,
      lots,
      taxYear: 2024,
      jurisdiction: 'us',
    });

    expect(result.taxYear).toBe(2024);
    expect(result.methods).toHaveLength(4);
    expect(['fifo', 'lifo', 'hifo', 'acb']).toContain(result.bestMethod);
    expect(['fifo', 'lifo', 'hifo', 'acb']).toContain(result.worstMethod);
    expect(result.maxSavings).toBeGreaterThanOrEqual(0);
  });

  it('should compute correct maxSavings as difference between worst and best', () => {
    const txns = [
      makeTx({ id: 'sell-1', tx_type: 'sell', amount: 1, value_usd: 6000 }),
    ];
    const lots = [
      makeLot({ id: 'lot-1', cost_per_unit_usd: 1000, remaining_amount: 1, acquired_at: '2024-01-01T00:00:00Z' }),
      makeLot({ id: 'lot-2', cost_per_unit_usd: 5000, remaining_amount: 1, acquired_at: '2024-03-01T00:00:00Z' }),
    ];

    const result = runMethodComparison({
      transactions: txns,
      lots,
      taxYear: 2024,
      jurisdiction: 'us',
    });

    // The best method should use the highest-cost lot (HIFO: basis=5000, gain=1000)
    // The worst should use the lowest-cost lot (FIFO: basis=1000, gain=5000)
    const hifo = result.methods.find((m) => m.method === 'hifo');
    const fifo = result.methods.find((m) => m.method === 'fifo');
    expect(hifo).toBeDefined();
    expect(fifo).toBeDefined();
    expect(hifo!.estimatedTax).toBeLessThan(fifo!.estimatedTax);
    expect(result.maxSavings).toBe(
      Math.round((fifo!.estimatedTax - hifo!.estimatedTax) * 100) / 100,
    );
  });

  it('should return empty results for year with no transactions', () => {
    const result = runMethodComparison({
      transactions: [],
      lots: [],
      taxYear: 2024,
      jurisdiction: 'us',
    });

    expect(result.methods).toHaveLength(4);
    // All methods should show 0 tax
    for (const m of result.methods) {
      expect(m.estimatedTax).toBe(0);
    }
    expect(result.maxSavings).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: runHarvestingAnalysis
// ---------------------------------------------------------------------------

describe('runHarvestingAnalysis', () => {
  it('should find harvesting opportunities when prices are below cost', () => {
    const lots = [
      makeLot({ id: 'lot-1', token_symbol: 'ETH', cost_per_unit_usd: 3000, remaining_amount: 2 }),
      makeLot({ id: 'lot-2', token_symbol: 'SOL', cost_per_unit_usd: 100, remaining_amount: 50 }),
    ];
    const txns: Transaction[] = [];
    const currentPrices = { ETH: 2000, SOL: 120 };

    const result = runHarvestingAnalysis({
      lots,
      transactions: txns,
      currentPrices,
      minLossUsd: 0,
      taxRate: 0.35,
    });

    // ETH: cost 3000*2=6000, value 2000*2=4000, loss=-2000
    expect(result.opportunities.length).toBe(1); // Only ETH has loss
    expect(result.opportunities[0]!.token).toBe('ETH');
    expect(result.opportunities[0]!.unrealizedLoss).toBeLessThan(0);
    expect(result.totalPotentialSavings).toBeGreaterThan(0);
  });

  it('should filter by minimum loss', () => {
    const lots = [
      makeLot({ id: 'lot-1', token_symbol: 'ETH', cost_per_unit_usd: 3000, remaining_amount: 1 }),
    ];
    const currentPrices = { ETH: 2900 };

    const result = runHarvestingAnalysis({
      lots,
      transactions: [],
      currentPrices,
      minLossUsd: 200, // Loss is only $100, should be filtered
      taxRate: 0.35,
    });

    expect(result.opportunities).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: runWalletHealth
// ---------------------------------------------------------------------------

describe('runWalletHealth', () => {
  it('should return perfect health for clean data', () => {
    const txns = [
      makeTx({ id: 'tx-1', is_classified: true, price_usd: 3000, value_usd: 3000 }),
      makeTx({ id: 'tx-2', is_classified: true, price_usd: 2500, value_usd: 2500 }),
    ];

    const result = runWalletHealth({ transactions: txns, walletCount: 2 });

    expect(result.healthScore).toBe(100);
    expect(result.classificationRate).toBe(100);
    expect(result.unclassifiedCount).toBe(0);
    expect(result.missingPriceCount).toBe(0);
    expect(result.issues).toHaveLength(0);
  });

  it('should penalize unclassified transactions', () => {
    const txns = [
      makeTx({ id: 'tx-1', is_classified: false }),
      makeTx({ id: 'tx-2', is_classified: true }),
    ];

    const result = runWalletHealth({ transactions: txns, walletCount: 1 });

    expect(result.unclassifiedCount).toBe(1);
    expect(result.classificationRate).toBe(50);
    expect(result.healthScore).toBeLessThan(100);
    expect(result.issues.some((i) => i.includes('unclassified'))).toBe(true);
  });

  it('should penalize missing price data', () => {
    const txns = [
      makeTx({ id: 'tx-1', price_usd: 0, value_usd: 0 }),
      makeTx({ id: 'tx-2', price_usd: 3000, value_usd: 3000 }),
    ];

    const result = runWalletHealth({ transactions: txns, walletCount: 1 });

    expect(result.missingPriceCount).toBe(1);
    expect(result.healthScore).toBeLessThan(100);
    expect(result.issues.some((i) => i.includes('missing price'))).toBe(true);
  });

  it('should flag high-value transactions', () => {
    const txns = [
      makeTx({ id: 'tx-1', value_usd: 200_000 }),
      makeTx({ id: 'tx-2', value_usd: 500 }),
    ];

    const result = runWalletHealth({ transactions: txns, walletCount: 1 });

    expect(result.highValueTransactions).toBe(1);
    expect(result.issues.some((i) => i.includes('high-value'))).toBe(true);
  });

  it('should handle empty data gracefully', () => {
    const result = runWalletHealth({ transactions: [], walletCount: 0 });

    expect(result.transactionCount).toBe(0);
    expect(result.walletCount).toBe(0);
    expect(result.healthScore).toBeLessThanOrEqual(70); // penalties for no wallets and no txns
    expect(result.issues.some((i) => i.includes('No wallets'))).toBe(true);
    expect(result.issues.some((i) => i.includes('No transactions'))).toBe(true);
  });

  it('should compute classificationRate as percentage', () => {
    const txns = [
      makeTx({ id: 'tx-1', is_classified: true }),
      makeTx({ id: 'tx-2', is_classified: true }),
      makeTx({ id: 'tx-3', is_classified: false }),
      makeTx({ id: 'tx-4', is_classified: false }),
    ];

    const result = runWalletHealth({ transactions: txns, walletCount: 1 });

    expect(result.classificationRate).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Tests: Verdict determination
// ---------------------------------------------------------------------------

describe('Verdict determination', () => {
  it('should return OPTIMIZE when savings are available with gains present', () => {
    // Use different lots at different prices to create method differences
    const txns = [
      makeTx({ id: 'sell-1', tx_type: 'sell', amount: 1, value_usd: 6000, timestamp: '2024-06-15T12:00:00Z' }),
    ];
    const lots = [
      makeLot({ id: 'lot-1', cost_per_unit_usd: 1000, remaining_amount: 1, acquired_at: '2024-01-01T00:00:00Z' }),
      makeLot({ id: 'lot-2', cost_per_unit_usd: 5000, remaining_amount: 1, acquired_at: '2024-03-01T00:00:00Z' }),
    ];

    const result = runTaxAnalysis({
      transactions: txns,
      lots,
      taxYear: 2024,
      jurisdiction: 'us',
      method: 'fifo', // This will use lot-1 (cost 1000), while hifo would use lot-2 (cost 5000)
      walletCount: 1,
    });

    // FIFO picks lot-1 (basis 1000, gain 5000), HIFO picks lot-2 (basis 5000, gain 1000)
    // Savings should be > $100
    expect(result.optimization.potentialSavings).toBeGreaterThan(100);
    expect(result.verdict).toBe('OPTIMIZE');
  });
});
