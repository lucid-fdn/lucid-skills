// ---------------------------------------------------------------------------
// brain/formatter.ts -- Plaintext formatters for brain tool results
// ---------------------------------------------------------------------------

import type {
  FleetStatus,
  TriageResult,
  FingerprintInsight,
  OptimizeInsight,
  StrategyInsight,
  CostInsight,
  ProtectResult,
  ReviewResult,
} from './types.js';

export function formatFleetStatus(r: FleetStatus): string {
  const lines: string[] = [
    `Fleet Status: ${r.verdict}`,
    `Active Workers: ${r.activeWorkers} | Speed: ${formatSpeed(r.totalKeysPerSecond)}`,
  ];
  if (r.offlineWorkers.length > 0) {
    lines.push(`Offline: ${r.offlineWorkers.join(', ')}`);
  }
  for (const m of r.modesNeedingAttention) {
    lines.push(`  Mode ${m.mode} (${m.modeName}): ${m.reason} [weight ${m.currentWeight} -> ${m.suggestedWeight}]`);
  }
  if (r.recommendations.length > 0) {
    lines.push('Recommendations:');
    for (const rec of r.recommendations) {
      lines.push(`  - ${rec}`);
    }
  }
  return lines.join('\n');
}

export function formatTriageResult(r: TriageResult): string {
  const lines: string[] = [
    `Target Triage: ${r.targetsAnalyzed} targets analyzed`,
    '',
    'Top Targets:',
  ];
  for (const t of r.topTargets.slice(0, 10)) {
    const bal = t.balanceBtc != null ? ` (${t.balanceBtc.toFixed(4)} BTC)` : '';
    const narrow = t.narrowingPossible ? ' [narrowing possible]' : '';
    lines.push(`  ${t.address}: ${t.topMode} (${(t.topProbability * 100).toFixed(1)}%)${bal}${narrow}`);
  }
  if (r.narrowingOpportunities.length > 0) {
    lines.push('', 'Narrowing Opportunities:');
    for (const n of r.narrowingOpportunities.slice(0, 5)) {
      lines.push(`  ${n.address}: mode ${n.modeName} — ${n.reductionPercent.toFixed(0)}% reduction`);
    }
  }
  return lines.join('\n');
}

export function formatFingerprintInsight(r: FingerprintInsight): string {
  const lines: string[] = [
    `Fingerprint: ${r.hash160Hex.slice(0, 16)}...`,
    `Wallet: ${r.walletSoftware ?? 'Unknown'} (${(r.confidence * 100).toFixed(0)}% confidence)`,
  ];
  if (r.probableModes.length > 0) {
    lines.push('Probable modes:');
    for (const pm of r.probableModes) {
      lines.push(`  Mode ${pm.mode}: ${(pm.probability * 100).toFixed(0)}%`);
    }
  }
  lines.push(`Recommendation: ${r.recommendation}`);
  return lines.join('\n');
}

export function formatOptimizeInsight(r: OptimizeInsight): string {
  const lines: string[] = [
    `Auto-Optimize: ${r.modesUpdated} modes updated`,
    `Targets analyzed: ${r.targetsAnalyzed} | Fingerprints used: ${r.fingerprintsUsed}`,
    `Estimated speedup: ${r.estimatedSpeedupFactor.toFixed(1)}x`,
    '',
    'Weight Changes:',
  ];
  for (const [mode, after] of Object.entries(r.afterWeights)) {
    const before = r.beforeWeights[mode] ?? 1.0;
    if (Math.abs(before - after) > 0.01) {
      lines.push(`  Mode ${mode}: ${before.toFixed(2)} -> ${after.toFixed(2)}`);
    }
  }
  return lines.join('\n');
}

export function formatStrategyInsight(r: StrategyInsight): string {
  const lines: string[] = [
    `Brain Wallet Strategy Review`,
    `Best: ${r.bestStrategy}`,
    '',
  ];
  for (const s of r.strategies) {
    lines.push(
      `  ${s.strategyTag}: ${s.totalHits}/${s.totalCandidates} hits (${(s.hitRate * 100).toFixed(2)}%) [${s.trend}]`,
    );
  }
  if (r.recommendations.length > 0) {
    lines.push('', 'Recommendations:');
    for (const rec of r.recommendations) {
      lines.push(`  - ${rec}`);
    }
  }
  return lines.join('\n');
}

export function formatCostInsight(r: CostInsight): string {
  const lines: string[] = [
    `Cost Analysis: ${formatSpeed(r.totalKeysChecked)} keys in ${(r.totalGpuSeconds / 3600).toFixed(1)}h GPU time`,
    '',
    'Most efficient modes:',
  ];
  for (const m of r.mostEfficient.slice(0, 5)) {
    lines.push(`  Mode ${m.mode} (${m.modeName}): ${m.costPerBillion.toFixed(2)}s per billion keys`);
  }
  if (r.recommendations.length > 0) {
    lines.push('', 'Recommendations:');
    for (const rec of r.recommendations) {
      lines.push(`  - ${rec}`);
    }
  }
  return lines.join('\n');
}

export function formatProtectResult(r: ProtectResult): string {
  const lines: string[] = [`Fleet Health: ${r.overallRisk}`];
  for (const c of r.checks) {
    const icon = c.status === 'ok' ? 'OK' : c.status === 'warning' ? 'WARN' : 'DANGER';
    lines.push(`  [${icon}] ${c.name}: ${c.detail}`);
  }
  return lines.join('\n');
}

export function formatReviewResult(r: ReviewResult): string {
  return [
    `Review (${r.period})`,
    `Keys checked: ${formatSpeed(r.keysCheckedInPeriod)}`,
    `Modes completed: ${r.modesCompleted}`,
    `Matches found: ${r.matchesFound}`,
    `Avg worker uptime: ${(r.avgWorkerUptime * 100).toFixed(0)}%`,
    `Top contributor: ${r.topContributor}`,
    `Suggestion: ${r.suggestion}`,
  ].join('\n');
}

function formatSpeed(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
