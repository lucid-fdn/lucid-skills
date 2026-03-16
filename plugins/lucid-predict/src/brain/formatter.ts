// ---------------------------------------------------------------------------
// brain/formatter.ts -- Format brain results into structured plaintext
// ---------------------------------------------------------------------------

import type { EvaluateResult, DiscoverResult, ArbitrageResult, CalibrateResult } from './types.js';

export function formatEvaluateResult(r: EvaluateResult): string {
  const lines: string[] = [];
  lines.push(`${r.market.title} — ${r.verdict} (Score: ${r.score}/100)`);
  lines.push(`Platform: ${r.market.platform} | ${r.market.url}`);
  lines.push('');

  lines.push('EDGE:');
  lines.push(`  • Type: ${r.edge.type} (${r.edge.pct > 0 ? '+' : ''}${r.edge.pct}%)`);
  lines.push(`  • ${r.edge.description}`);
  lines.push('');

  lines.push('EVIDENCE:');
  lines.push(`  • Market price: ${(r.evidence.marketPrice * 100).toFixed(1)}¢`);
  lines.push(`  • Estimated probability: ${(r.evidence.estimatedProbability * 100).toFixed(1)}%`);
  lines.push(`  • EV: $${r.evidence.ev.ev.toFixed(2)} (ROI: ${r.evidence.ev.roiPct.toFixed(1)}%)`);
  lines.push(`  • Liquidity: ${r.evidence.liquidity.rating} (${r.evidence.liquidity.score}/100)`);
  lines.push(`  • Days to close: ${r.evidence.daysToClose}`);
  if (r.evidence.isNearCertainExpiry) {
    lines.push(`  • ⚡ NEAR-CERTAIN EXPIRY — bond-like opportunity`);
  }
  lines.push('');

  lines.push('SIZING:');
  lines.push(`  • Recommended: ${(r.sizing.recommended * 100).toFixed(1)}% of bankroll`);
  lines.push(`  • Position size: $${r.sizing.positionSize.toFixed(2)}`);
  lines.push(`  • Kelly: ${(r.sizing.fullKelly * 100).toFixed(1)}% full / ${(r.sizing.halfKelly * 100).toFixed(1)}% half`);
  lines.push('');

  lines.push('RISKS:');
  if (r.risks.length > 0) {
    for (const risk of r.risks) lines.push(`  • ${risk}`);
  } else {
    lines.push('  • No significant risks identified');
  }
  lines.push('');

  lines.push(`INVALIDATION: ${r.invalidation}`);
  return lines.join('\n');
}

export function formatDiscoverResult(r: DiscoverResult): string {
  const lines: string[] = [];
  lines.push(`Discover: Found ${r.items.length} opportunities (scanned ${r.scannedCount} markets across ${r.platformsSearched.join(', ')})`);
  lines.push('');
  for (const item of r.items) {
    lines.push(`  ${item.verdict} | ${item.market.title}`);
    lines.push(`    Edge: ${item.edgePct.toFixed(1)}% (${item.edgeType}) | Score: ${item.score}/100`);
    lines.push(`    Platform: ${item.market.platform} | Price: ${(item.market.currentPrices.yes * 100).toFixed(0)}¢`);
    lines.push('');
  }
  return lines.join('\n');
}

export function formatArbitrageResult(r: ArbitrageResult): string {
  const lines: string[] = [];
  lines.push(`Arbitrage: Found ${r.opportunities.length} opportunities (scanned ${r.pairsScanned} pairs across ${r.platformsSearched.join(', ')})`);
  lines.push('');
  for (const opp of r.opportunities) {
    lines.push(`  ${opp.marketA.title}`);
    lines.push(`    ${opp.marketA.platform}: YES @ ${(opp.yesPrice * 100).toFixed(0)}¢ | ${opp.marketB.platform}: NO @ ${(opp.noPrice * 100).toFixed(0)}¢`);
    lines.push(`    Combined: ${(opp.combinedCost * 100).toFixed(0)}¢ | Profit: ${(opp.profit * 100).toFixed(1)}¢ (${opp.profitPct.toFixed(1)}%)`);
    lines.push('');
  }
  return lines.join('\n');
}

export function formatCalibrateResult(r: CalibrateResult): string {
  const lines: string[] = [];
  lines.push(`Calibration Report — ${r.rating.toUpperCase()} (Brier: ${r.brierScore.toFixed(4)})`);
  lines.push(`Total forecasts: ${r.totalForecasts} | Overconfidence: ${r.overconfidenceScore > 0 ? '+' : ''}${r.overconfidenceScore.toFixed(4)}`);
  lines.push('');
  lines.push('Buckets:');
  for (const b of r.buckets) {
    lines.push(`  ${b.range}: predicted=${(b.predicted * 100).toFixed(0)}% actual=${(b.actual * 100).toFixed(0)}% (n=${b.count}, dev=${b.deviation.toFixed(3)})`);
  }
  return lines.join('\n');
}
