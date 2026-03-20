// ---------------------------------------------------------------------------
// brain/formatter.ts -- Format brain results into structured plaintext
// ---------------------------------------------------------------------------

import type {
  TaxAnalysisResult,
  MethodComparisonResult,
  HarvestingResult,
  WalletHealthResult,
} from './types.js';

function fmtUsd(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// TaxAnalysisResult
// ---------------------------------------------------------------------------

export function formatTaxAnalysis(r: TaxAnalysisResult): string {
  const lines: string[] = [];
  lines.push(`Tax Analysis ${r.taxYear} (${r.jurisdiction.toUpperCase()}) — ${r.verdict}`);
  lines.push('='.repeat(60));
  lines.push('');

  lines.push('SUMMARY:');
  lines.push(`  Total proceeds:    ${fmtUsd(r.summary.totalProceeds)}`);
  lines.push(`  Total cost basis:  ${fmtUsd(r.summary.totalCostBasis)}`);
  lines.push(`  Short-term gains:  ${fmtUsd(r.summary.shortTermGains)}`);
  lines.push(`  Long-term gains:   ${fmtUsd(r.summary.longTermGains)}`);
  lines.push(`  Total income:      ${fmtUsd(r.summary.totalIncome)}`);
  lines.push(`  Total losses:      ${fmtUsd(r.summary.totalLosses)}`);
  lines.push(`  Estimated tax:     ${fmtUsd(r.summary.estimatedTax)}`);
  lines.push(`  Effective rate:    ${fmtPct(r.summary.effectiveRate)}`);
  lines.push('');

  lines.push('OPTIMIZATION:');
  lines.push(`  Current method:    ${r.optimization.currentMethod.toUpperCase()}`);
  lines.push(`  Best method:       ${r.optimization.bestMethod.toUpperCase()}`);
  lines.push(`  Potential savings: ${fmtUsd(r.optimization.potentialSavings)}`);
  if (r.optimization.harvestingOpportunities > 0) {
    lines.push(`  Harvesting opps:   ${r.optimization.harvestingOpportunities}`);
    lines.push(`  Harvest savings:   ${fmtUsd(r.optimization.estimatedHarvestSavings)}`);
  }
  lines.push('');

  if (r.riskFactors.length > 0) {
    lines.push('RISK FACTORS:');
    for (const risk of r.riskFactors) {
      lines.push(`  - ${risk}`);
    }
    lines.push('');
  }

  lines.push('RECOMMENDATIONS:');
  for (const rec of r.recommendations) {
    lines.push(`  - ${rec}`);
  }

  lines.push('');
  lines.push('Disclaimer: This is an estimate. Consult a qualified tax professional.');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// MethodComparisonResult
// ---------------------------------------------------------------------------

export function formatMethodComparison(r: MethodComparisonResult): string {
  const lines: string[] = [];
  lines.push(`Method Comparison for ${r.taxYear}`);
  lines.push('='.repeat(50));
  lines.push('');

  for (const m of r.methods) {
    lines.push(`${m.method.toUpperCase()}:`);
    lines.push(`  Short-term: ${fmtUsd(m.shortTermGains)} | Long-term: ${fmtUsd(m.longTermGains)}`);
    lines.push(`  Losses: ${fmtUsd(m.totalLosses)} | Estimated tax: ${fmtUsd(m.estimatedTax)}`);
    lines.push('');
  }

  lines.push(`Best method:  ${r.bestMethod.toUpperCase()}`);
  lines.push(`Worst method: ${r.worstMethod.toUpperCase()}`);
  lines.push(`Max savings:  ${fmtUsd(r.maxSavings)}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// HarvestingResult
// ---------------------------------------------------------------------------

export function formatHarvestingResult(r: HarvestingResult): string {
  const lines: string[] = [];
  lines.push(`Tax-Loss Harvesting: ${r.opportunities.length} opportunities`);
  lines.push('='.repeat(50));
  lines.push('');

  if (r.opportunities.length === 0) {
    lines.push('No harvesting opportunities found.');
    return lines.join('\n');
  }

  for (const opp of r.opportunities) {
    const washLabel = opp.washSaleRisk ? ' [WASH SALE RISK]' : '';
    lines.push(`  ${opp.token}: ${fmtUsd(opp.unrealizedLoss)} loss (${opp.lossPercentage.toFixed(1)}%)${washLabel}`);
    lines.push(`    Estimated tax savings: ${fmtUsd(opp.estimatedTaxSavings)}`);
  }

  lines.push('');
  lines.push(`Total potential savings: ${fmtUsd(r.totalPotentialSavings)}`);
  if (r.washSaleWarnings > 0) {
    lines.push(`Wash sale warnings: ${r.washSaleWarnings} tokens — wait 30 days before repurchasing`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// WalletHealthResult
// ---------------------------------------------------------------------------

export function formatWalletHealth(r: WalletHealthResult): string {
  const lines: string[] = [];
  const rating = r.healthScore >= 80 ? 'GOOD' : r.healthScore >= 50 ? 'FAIR' : 'POOR';
  lines.push(`Wallet Health: ${rating} (${r.healthScore}/100)`);
  lines.push('='.repeat(50));
  lines.push('');

  lines.push(`  Wallets:             ${r.walletCount}`);
  lines.push(`  Transactions:        ${r.transactionCount}`);
  lines.push(`  Classified:          ${r.classificationRate.toFixed(1)}%`);
  lines.push(`  Unclassified:        ${r.unclassifiedCount}`);
  lines.push(`  Missing prices:      ${r.missingPriceCount}`);
  lines.push(`  High-value (>$100k): ${r.highValueTransactions}`);

  if (r.issues.length > 0) {
    lines.push('');
    lines.push('ISSUES:');
    for (const issue of r.issues) {
      lines.push(`  - ${issue}`);
    }
  }

  return lines.join('\n');
}
