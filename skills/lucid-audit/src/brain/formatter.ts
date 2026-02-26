// ---------------------------------------------------------------------------
// brain/formatter.ts -- Format brain results into structured plaintext
// ---------------------------------------------------------------------------

import type { AuditResult, CompareResult, BatchScanResult, GasResult } from './types.js';
import { formatScoreBar } from '../core/utils/text.js';

// ---------------------------------------------------------------------------
// AuditResult formatter
// ---------------------------------------------------------------------------

export function formatAuditResult(r: AuditResult, detail: 'full' | 'compact' = 'full'): string {
  const lines: string[] = [];

  const verdictEmoji =
    r.verdict === 'SAFE'
      ? 'PASS'
      : r.verdict === 'CAUTION'
        ? 'WARN'
        : r.verdict === 'RISKY'
          ? 'RISK'
          : 'CRIT';

  lines.push(`[${verdictEmoji}] ${r.contract.name} -- ${r.verdict} (Score: ${r.score}/100, Grade: ${r.grade})`);
  lines.push(formatScoreBar(r.score));

  if (r.contract.solidityVersion) {
    lines.push(`Solidity: ${r.contract.solidityVersion}`);
  }
  if (r.contract.chain) {
    lines.push(`Chain: ${r.contract.chain}`);
  }
  if (r.contract.address) {
    lines.push(`Address: ${r.contract.address}`);
  }
  lines.push('');

  lines.push('FINDINGS:');
  lines.push(
    `  Critical: ${r.findings.critical} | High: ${r.findings.high} | Medium: ${r.findings.medium} | Low: ${r.findings.low} | Info: ${r.findings.info}`,
  );
  lines.push('');

  if (detail === 'full' && r.topVulnerabilities.length > 0) {
    lines.push('TOP VULNERABILITIES:');
    for (const v of r.topVulnerabilities) {
      lines.push(`  [${v.severity.toUpperCase()}] ${v.title}`);
      lines.push(`    Category: ${v.category} | Location: ${v.location}`);
      lines.push(`    Fix: ${v.recommendation}`);
    }
    lines.push('');
  }

  if (r.gasAnalysis.totalIssues > 0) {
    lines.push(`GAS: ${r.gasAnalysis.totalIssues} issues, ~${r.gasAnalysis.estimatedSavings} gas savings`);
    if (detail === 'full') {
      for (const g of r.gasAnalysis.topOpportunities) {
        lines.push(`  ${g.title} (~${g.savings} gas): ${g.recommendation}`);
      }
    }
    lines.push('');
  }

  if (r.riskFactors.length > 0) {
    lines.push('RISK FACTORS:');
    for (const rf of r.riskFactors) {
      lines.push(`  - ${rf}`);
    }
    lines.push('');
  }

  lines.push(`Provenance: ${r.provenance.tool} v${r.provenance.version} @ ${r.provenance.timestamp}`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CompareResult formatter
// ---------------------------------------------------------------------------

export function formatCompareResult(r: CompareResult): string {
  const lines: string[] = [];

  const trend = r.scoreDelta > 0 ? 'IMPROVED' : r.scoreDelta < 0 ? 'REGRESSED' : 'UNCHANGED';
  const sign = r.scoreDelta >= 0 ? '+' : '';

  lines.push(`Contract Comparison: ${r.contractA.name} vs ${r.contractB.name}`);
  lines.push('');
  lines.push(`  ${r.contractA.name}: ${r.contractA.score}/100 (${r.contractA.grade})`);
  lines.push(`  ${r.contractB.name}: ${r.contractB.score}/100 (${r.contractB.grade})`);
  lines.push(`  Delta: ${sign}${r.scoreDelta} points -- ${trend}`);
  lines.push('');

  if (r.fixedIssues.length > 0) {
    lines.push(`FIXED (${r.fixedIssues.length}):`);
    for (const i of r.fixedIssues) {
      lines.push(`  [${i.severity.toUpperCase()}] ${i.title}`);
    }
    lines.push('');
  }

  if (r.newIssues.length > 0) {
    lines.push(`NEW ISSUES (${r.newIssues.length}):`);
    for (const i of r.newIssues) {
      lines.push(`  [${i.severity.toUpperCase()}] ${i.title}`);
    }
    lines.push('');
  }

  if (r.persistentIssues.length > 0) {
    lines.push(`PERSISTENT (${r.persistentIssues.length}):`);
    for (const i of r.persistentIssues) {
      lines.push(`  [${i.severity.toUpperCase()}] ${i.title}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// BatchScanResult formatter
// ---------------------------------------------------------------------------

export function formatBatchResult(r: BatchScanResult): string {
  const lines: string[] = [];

  lines.push(`Batch Scan: ${r.contracts.length} contracts | Avg Score: ${r.avgScore}/100`);
  lines.push(`Worst: ${r.worstContract}`);
  lines.push(
    `Total: ${r.totalFindings.critical} critical, ${r.totalFindings.high} high, ${r.totalFindings.medium} medium, ${r.totalFindings.low} low, ${r.totalFindings.info} info`,
  );
  lines.push('');

  for (const c of r.contracts) {
    lines.push(`  ${c.verdict.padEnd(8)} ${c.name}: ${c.score}/100 (${c.grade}) -- ${c.criticalCount} critical`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// GasResult formatter
// ---------------------------------------------------------------------------

export function formatGasResult(r: GasResult): string {
  const lines: string[] = [];

  lines.push(`Gas Analysis: ${r.totalIssues} issues | ~${r.estimatedSavings} gas savings`);
  lines.push('');

  if (r.issues.length > 0) {
    for (const i of r.issues) {
      lines.push(`  [${i.category}] ${i.title} (${i.location})`);
      lines.push(`    Savings: ~${i.savings} gas`);
      lines.push(`    Fix: ${i.recommendation}`);
    }
    lines.push('');
  }

  lines.push(r.summary);

  return lines.join('\n');
}
