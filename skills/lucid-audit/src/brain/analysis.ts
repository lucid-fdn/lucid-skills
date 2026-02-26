// ---------------------------------------------------------------------------
// brain/analysis.ts -- Core brain analysis: combine all detectors into
// structured results (AuditResult, CompareResult, BatchScanResult, GasResult)
// ---------------------------------------------------------------------------

import { fullVulnerabilityScan } from '../core/analysis/vulnerability-detector.js';
import { fullGasAnalysis } from '../core/analysis/gas-analyzer.js';
import {
  computeSecurityScore,
  scoreToGrade,
  buildScoreBreakdown,
} from '../core/analysis/security-scorer.js';
import { extractPragmaVersion } from '../core/utils/text.js';
import type {
  AuditResult,
  AuditVerdict,
  CompareResult,
  BatchScanResult,
  GasResult,
} from './types.js';
import { PLUGIN_VERSION } from '../core/plugin-id.js';

// ---------------------------------------------------------------------------
// runAudit -- full audit of a single contract
// ---------------------------------------------------------------------------

export function runAudit(params: {
  sourceCode: string;
  contractName?: string;
  chain?: string;
  address?: string;
}): AuditResult {
  const vulns = fullVulnerabilityScan(params.sourceCode);
  const gas = fullGasAnalysis(params.sourceCode);
  const score = computeSecurityScore(vulns);
  const grade = scoreToGrade(score);
  const breakdown = buildScoreBreakdown(vulns);
  const version = extractPragmaVersion(params.sourceCode);

  // Determine verdict based on score and critical findings
  let verdict: AuditVerdict;
  if (breakdown.findings.critical > 0) verdict = 'CRITICAL';
  else if (score < 40) verdict = 'RISKY';
  else if (score < 75) verdict = 'CAUTION';
  else verdict = 'SAFE';

  // Risk factors
  const riskFactors: string[] = [];
  if (breakdown.findings.critical > 0) {
    riskFactors.push(`${breakdown.findings.critical} critical vulnerabilities`);
  }
  if (breakdown.findings.high > 0) {
    riskFactors.push(`${breakdown.findings.high} high-severity issues`);
  }
  if (version) {
    const versionNum = parseFloat(version.replace(/[^\d.]/g, ''));
    if (!isNaN(versionNum) && versionNum < 0.8) {
      riskFactors.push('Solidity < 0.8.0 (no built-in overflow protection)');
    }
  }
  if (gas.totalEstimatedSavings > 50000) {
    riskFactors.push(`${gas.totalEstimatedSavings} gas optimization potential`);
  }

  return {
    schemaVersion: 1,
    contract: {
      name: params.contractName ?? 'Unknown',
      chain: params.chain,
      address: params.address,
      solidityVersion: version ?? undefined,
    },
    verdict,
    score,
    grade,
    findings: breakdown.findings,
    topVulnerabilities: vulns.slice(0, 10).map((v) => ({
      category: v.category,
      severity: v.severity,
      title: v.title,
      location: v.location,
      recommendation: v.recommendation,
    })),
    gasAnalysis: {
      totalIssues: gas.issues.length,
      estimatedSavings: gas.totalEstimatedSavings,
      topOpportunities: gas.issues.slice(0, 5).map((i) => ({
        title: i.title,
        savings: i.estimated_savings,
        recommendation: i.recommendation,
      })),
    },
    riskFactors,
    provenance: {
      tool: 'lucid-audit',
      version: PLUGIN_VERSION,
      timestamp: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// runCompare -- compare two contract versions
// ---------------------------------------------------------------------------

export function runCompare(params: {
  sourceA: string;
  sourceB: string;
  labelA?: string;
  labelB?: string;
}): CompareResult {
  const { sourceA, sourceB, labelA = 'Version A', labelB = 'Version B' } = params;

  const vulnsA = fullVulnerabilityScan(sourceA);
  const vulnsB = fullVulnerabilityScan(sourceB);
  const scoreA = computeSecurityScore(vulnsA);
  const scoreB = computeSecurityScore(vulnsB);
  const gradeA = scoreToGrade(scoreA);
  const gradeB = scoreToGrade(scoreB);

  const titlesA = new Set(vulnsA.map((v) => v.title));
  const titlesB = new Set(vulnsB.map((v) => v.title));

  const fixedIssues = vulnsA
    .filter((v) => !titlesB.has(v.title))
    .map((v) => ({ title: v.title, severity: v.severity }));

  const newIssues = vulnsB
    .filter((v) => !titlesA.has(v.title))
    .map((v) => ({ title: v.title, severity: v.severity }));

  const persistentIssues = vulnsB
    .filter((v) => titlesA.has(v.title))
    .map((v) => ({ title: v.title, severity: v.severity }));

  const scoreDelta = scoreB - scoreA;
  const verdict =
    scoreDelta > 0
      ? 'IMPROVED'
      : scoreDelta < 0
        ? 'REGRESSED'
        : 'UNCHANGED';

  return {
    contractA: { name: labelA, score: scoreA, grade: gradeA },
    contractB: { name: labelB, score: scoreB, grade: gradeB },
    scoreDelta,
    fixedIssues,
    newIssues,
    persistentIssues,
    verdict,
  };
}

// ---------------------------------------------------------------------------
// runBatchScan -- scan multiple contracts
// ---------------------------------------------------------------------------

export function runBatchScan(
  contracts: Array<{ source: string; name: string }>,
): BatchScanResult {
  const totalFindings = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let totalScore = 0;
  let worstScore = 101;
  let worstName = '';

  const results = contracts.map((c) => {
    const audit = runAudit({ sourceCode: c.source, contractName: c.name });
    totalScore += audit.score;

    totalFindings.critical += audit.findings.critical;
    totalFindings.high += audit.findings.high;
    totalFindings.medium += audit.findings.medium;
    totalFindings.low += audit.findings.low;
    totalFindings.info += audit.findings.info;

    if (audit.score < worstScore) {
      worstScore = audit.score;
      worstName = c.name;
    }

    return {
      name: c.name,
      score: audit.score,
      grade: audit.grade,
      verdict: audit.verdict,
      criticalCount: audit.findings.critical,
    };
  });

  return {
    contracts: results,
    avgScore: contracts.length > 0 ? Math.round(totalScore / contracts.length) : 0,
    worstContract: worstName,
    totalFindings,
  };
}

// ---------------------------------------------------------------------------
// runGasAnalysis -- focused gas analysis with structured output
// ---------------------------------------------------------------------------

export function runGasAnalysis(params: {
  sourceCode: string;
}): GasResult {
  const gas = fullGasAnalysis(params.sourceCode);

  return {
    schemaVersion: 1,
    totalIssues: gas.issues.length,
    estimatedSavings: gas.totalEstimatedSavings,
    issues: gas.issues.map((i) => ({
      category: i.category,
      title: i.title,
      location: i.location,
      savings: i.estimated_savings,
      recommendation: i.recommendation,
    })),
    summary: gas.summary,
    provenance: {
      tool: 'lucid-audit',
      version: PLUGIN_VERSION,
      timestamp: new Date().toISOString(),
    },
  };
}
