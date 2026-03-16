// ---------------------------------------------------------------------------
// brain/analysis.ts -- Core brain analysis engine for Lucid Tax
// ---------------------------------------------------------------------------

import type { Transaction, CostBasisLot } from '../core/types/database.js';
import type { CostBasisMethod, TaxJurisdiction } from '../core/types/common.js';
import {
  calculateTaxableEvents,
  calculateIncome,
  aggregateByYear,
  estimateTax,
  type YearSummary,
  type TaxEventInput,
} from '../core/analysis/tax-calculator.js';
import {
  buildPositions,
  findHarvestingOpportunities,
  calculateWashSaleRisk,
  estimateTaxSavings,
} from '../core/analysis/tax-loss-harvester.js';
import type {
  TaxAnalysisResult,
  TaxVerdict,
  MethodComparisonResult,
  HarvestingResult,
  WalletHealthResult,
} from './types.js';

const BRAIN_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

export interface TaxAnalysisParams {
  transactions: Transaction[];
  lots: CostBasisLot[];
  taxYear: number;
  jurisdiction: TaxJurisdiction;
  method: CostBasisMethod;
  currentPrices?: Record<string, number>;
  walletCount?: number;
}

export interface MethodComparisonParams {
  transactions: Transaction[];
  lots: CostBasisLot[];
  taxYear: number;
  jurisdiction: TaxJurisdiction;
}

export interface HarvestingAnalysisParams {
  lots: CostBasisLot[];
  transactions: Transaction[];
  currentPrices: Record<string, number>;
  minLossUsd: number;
  taxRate: number;
}

export interface WalletHealthParams {
  transactions: Transaction[];
  walletCount: number;
}

// ---------------------------------------------------------------------------
// 1. runTaxAnalysis
// ---------------------------------------------------------------------------

export function runTaxAnalysis(params: TaxAnalysisParams): TaxAnalysisResult {
  const { transactions, lots, taxYear, jurisdiction, method, currentPrices, walletCount } = params;

  // Step 1: Calculate gains with current method
  const events = calculateTaxableEvents(transactions, lots, method, jurisdiction);
  const income = calculateIncome(transactions);
  const yearly = aggregateByYear(events, income);
  const summary = yearly.get(taxYear) ?? emptySummary(taxYear);
  const estimatedTax = estimateTax(summary, jurisdiction);

  // Step 2: Run method comparison to find best method
  const comparison = runMethodComparison({
    transactions,
    lots,
    taxYear,
    jurisdiction,
  });

  // Step 3: Find harvesting opportunities if prices available
  let harvestingOpps = 0;
  let harvestSavings = 0;
  if (currentPrices && Object.keys(currentPrices).length > 0) {
    const positions = buildPositions(lots);
    const opportunities = findHarvestingOpportunities(positions, currentPrices);
    harvestingOpps = opportunities.length;
    harvestSavings = estimateTaxSavings(opportunities, 0.35);
  }

  // Step 4: Determine verdict
  const totalGainsAndIncome = summary.short_term_gains + summary.long_term_gains + summary.total_income;
  const effectiveRate = totalGainsAndIncome > 0 ? estimatedTax / totalGainsAndIncome : 0;

  const unclassifiedCount = transactions.filter((t) => !t.is_classified).length;
  const missingPriceCount = transactions.filter((t) => t.price_usd === 0 && t.value_usd === 0).length;
  const highValueCount = transactions.filter((t) => t.value_usd > 100_000).length;

  const verdict = determineVerdict({
    potentialSavings: comparison.maxSavings,
    unclassifiedCount,
    missingPriceCount,
    highValueCount,
    totalGainsAndIncome,
    totalLosses: summary.total_losses,
  });

  // Step 5: Build risk factors
  const riskFactors = buildRiskFactors({
    unclassifiedCount,
    missingPriceCount,
    highValueCount,
    walletCount: walletCount ?? 0,
    txCount: transactions.length,
  });

  // Step 6: Build recommendations
  const recommendations = buildRecommendations({
    potentialSavings: comparison.maxSavings,
    bestMethod: comparison.bestMethod,
    currentMethod: method,
    harvestingOpps,
    harvestSavings,
    unclassifiedCount,
    missingPriceCount,
  });

  return {
    schemaVersion: 1,
    taxYear,
    jurisdiction,
    verdict,
    summary: {
      totalProceeds: summary.total_proceeds,
      totalCostBasis: summary.total_cost_basis,
      shortTermGains: summary.short_term_gains,
      longTermGains: summary.long_term_gains,
      totalIncome: summary.total_income,
      totalLosses: summary.total_losses,
      estimatedTax,
      effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    },
    optimization: {
      currentMethod: method,
      bestMethod: comparison.bestMethod,
      potentialSavings: comparison.maxSavings,
      harvestingOpportunities: harvestingOpps,
      estimatedHarvestSavings: harvestSavings,
    },
    riskFactors,
    recommendations,
    provenance: {
      tool: 'lucid_tax_analyze',
      version: BRAIN_VERSION,
      timestamp: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// 2. runMethodComparison
// ---------------------------------------------------------------------------

export function runMethodComparison(params: MethodComparisonParams): MethodComparisonResult {
  const { transactions, lots, taxYear, jurisdiction } = params;
  const methods: CostBasisMethod[] = ['fifo', 'lifo', 'hifo', 'acb'];

  const results: MethodComparisonResult['methods'] = [];

  for (const method of methods) {
    // Deep clone lots so each method starts fresh
    const freshLots = lots.map((l) => ({ ...l }));
    const events = calculateTaxableEvents(transactions, freshLots, method, jurisdiction);
    const income = calculateIncome(transactions);
    const yearly = aggregateByYear(events, income);
    const summary = yearly.get(taxYear) ?? emptySummary(taxYear);
    const tax = estimateTax(summary, jurisdiction);

    results.push({
      method,
      shortTermGains: summary.short_term_gains,
      longTermGains: summary.long_term_gains,
      totalLosses: summary.total_losses,
      estimatedTax: Math.round(tax * 100) / 100,
    });
  }

  // Find best and worst
  const sorted = [...results].sort((a, b) => a.estimatedTax - b.estimatedTax);
  const bestMethod = sorted[0]?.method ?? 'fifo';
  const worstMethod = sorted[sorted.length - 1]?.method ?? 'fifo';
  const maxSavings = (sorted[sorted.length - 1]?.estimatedTax ?? 0) - (sorted[0]?.estimatedTax ?? 0);

  return {
    taxYear,
    methods: results,
    bestMethod,
    worstMethod,
    maxSavings: Math.round(maxSavings * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// 3. runHarvestingAnalysis
// ---------------------------------------------------------------------------

export function runHarvestingAnalysis(params: HarvestingAnalysisParams): HarvestingResult {
  const { lots, transactions, currentPrices, minLossUsd, taxRate } = params;

  const positions = buildPositions(lots);
  const opportunities = findHarvestingOpportunities(positions, currentPrices, minLossUsd);

  const result: HarvestingResult = {
    opportunities: [],
    totalPotentialSavings: 0,
    washSaleWarnings: 0,
  };

  for (const opp of opportunities) {
    const washSaleRisk = calculateWashSaleRisk(transactions, opp.tokenSymbol);
    const taxSavings = Math.abs(opp.unrealizedLoss) * taxRate;

    result.opportunities.push({
      token: opp.tokenSymbol,
      unrealizedLoss: Math.round(opp.unrealizedLoss * 100) / 100,
      lossPercentage: Math.round(opp.lossPercentage * 100) / 100,
      washSaleRisk,
      estimatedTaxSavings: Math.round(taxSavings * 100) / 100,
    });

    result.totalPotentialSavings += taxSavings;
    if (washSaleRisk) result.washSaleWarnings++;
  }

  result.totalPotentialSavings = Math.round(result.totalPotentialSavings * 100) / 100;
  return result;
}

// ---------------------------------------------------------------------------
// 4. runWalletHealth
// ---------------------------------------------------------------------------

export function runWalletHealth(params: WalletHealthParams): WalletHealthResult {
  const { transactions, walletCount } = params;
  const txCount = transactions.length;

  const unclassifiedCount = transactions.filter((t) => !t.is_classified).length;
  const missingPriceCount = transactions.filter((t) => t.price_usd === 0 && t.value_usd === 0).length;
  const highValueTransactions = transactions.filter((t) => t.value_usd > 100_000).length;

  const classificationRate = txCount > 0
    ? Math.round(((txCount - unclassifiedCount) / txCount) * 10000) / 100
    : 100;

  // Health score: 100 minus penalties
  let healthScore = 100;

  // Penalty for unclassified (up to 30 points)
  if (txCount > 0) {
    const unclassifiedPct = unclassifiedCount / txCount;
    healthScore -= Math.min(30, Math.round(unclassifiedPct * 100));
  }

  // Penalty for missing prices (up to 25 points)
  if (txCount > 0) {
    const missingPricePct = missingPriceCount / txCount;
    healthScore -= Math.min(25, Math.round(missingPricePct * 100));
  }

  // Penalty for no wallets (10 points)
  if (walletCount === 0) healthScore -= 10;

  // Penalty for no transactions (20 points)
  if (txCount === 0) healthScore -= 20;

  // Penalty for high-value unreviewed transactions (up to 15 points)
  healthScore -= Math.min(15, highValueTransactions * 3);

  healthScore = Math.max(0, healthScore);

  // Build issues list
  const issues: string[] = [];
  if (walletCount === 0) issues.push('No wallets imported');
  if (txCount === 0) issues.push('No transactions found');
  if (unclassifiedCount > 0) issues.push(`${unclassifiedCount} unclassified transactions`);
  if (missingPriceCount > 0) issues.push(`${missingPriceCount} transactions missing price data`);
  if (highValueTransactions > 0) issues.push(`${highValueTransactions} high-value transactions (>$100k) need review`);

  return {
    walletCount,
    transactionCount: txCount,
    unclassifiedCount,
    missingPriceCount,
    highValueTransactions,
    classificationRate,
    healthScore,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptySummary(taxYear: number): YearSummary {
  return {
    tax_year: taxYear,
    total_proceeds: 0,
    total_cost_basis: 0,
    short_term_gains: 0,
    long_term_gains: 0,
    total_income: 0,
    total_losses: 0,
  };
}

interface VerdictInputs {
  potentialSavings: number;
  unclassifiedCount: number;
  missingPriceCount: number;
  highValueCount: number;
  totalGainsAndIncome: number;
  totalLosses: number;
}

function determineVerdict(inputs: VerdictInputs): TaxVerdict {
  const { potentialSavings, unclassifiedCount, missingPriceCount, highValueCount, totalGainsAndIncome } = inputs;

  // AUDIT_RISK: many unclassified or missing data + high value transactions
  if (highValueCount >= 3 && (unclassifiedCount > 10 || missingPriceCount > 10)) {
    return 'AUDIT_RISK';
  }

  // ACTION_NEEDED: significant unclassified or missing price data
  if (unclassifiedCount > 5 || missingPriceCount > 5) {
    return 'ACTION_NEEDED';
  }

  // OPTIMIZE: savings available above threshold
  if (potentialSavings > 100 && totalGainsAndIncome > 0) {
    return 'OPTIMIZE';
  }

  return 'COMPLIANT';
}

interface RiskFactorInputs {
  unclassifiedCount: number;
  missingPriceCount: number;
  highValueCount: number;
  walletCount: number;
  txCount: number;
}

function buildRiskFactors(inputs: RiskFactorInputs): string[] {
  const risks: string[] = [];
  if (inputs.unclassifiedCount > 0) {
    risks.push(`${inputs.unclassifiedCount} unclassified transactions may result in incorrect tax calculations`);
  }
  if (inputs.missingPriceCount > 0) {
    risks.push(`${inputs.missingPriceCount} transactions missing price data — cost basis may be inaccurate`);
  }
  if (inputs.highValueCount > 0) {
    risks.push(`${inputs.highValueCount} transactions over $100k — increased audit likelihood`);
  }
  if (inputs.walletCount === 0) {
    risks.push('No wallets imported — tax calculation may be incomplete');
  }
  if (inputs.txCount === 0) {
    risks.push('No transactions found — import wallets to begin');
  }
  return risks;
}

interface RecommendationInputs {
  potentialSavings: number;
  bestMethod: string;
  currentMethod: CostBasisMethod;
  harvestingOpps: number;
  harvestSavings: number;
  unclassifiedCount: number;
  missingPriceCount: number;
}

function buildRecommendations(inputs: RecommendationInputs): string[] {
  const recs: string[] = [];

  if (inputs.potentialSavings > 0 && inputs.bestMethod !== inputs.currentMethod) {
    recs.push(
      `Switch from ${inputs.currentMethod.toUpperCase()} to ${inputs.bestMethod.toUpperCase()} to save ~$${inputs.potentialSavings.toFixed(2)} in taxes`,
    );
  }

  if (inputs.harvestingOpps > 0) {
    recs.push(
      `${inputs.harvestingOpps} tax-loss harvesting opportunities available with ~$${inputs.harvestSavings.toFixed(2)} potential savings`,
    );
  }

  if (inputs.unclassifiedCount > 0) {
    recs.push(`Run tax_classify_transactions to classify ${inputs.unclassifiedCount} pending transactions`);
  }

  if (inputs.missingPriceCount > 0) {
    recs.push(`Configure a price provider API key to fill ${inputs.missingPriceCount} missing price entries`);
  }

  if (recs.length === 0) {
    recs.push('Tax position looks good — continue monitoring for year-end optimization');
  }

  return recs;
}
