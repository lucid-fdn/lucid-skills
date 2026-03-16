// ---------------------------------------------------------------------------
// security-scorer.ts -- Calculate security score (0-100) from findings
// ---------------------------------------------------------------------------

import type { VulnerabilitySeverity, SecurityGrade, FindingsCount } from '../types/common.js';
import type { RawVulnerability } from './vulnerability-detector.js';

/** Severity weight mapping. */
export function severityWeight(s: VulnerabilitySeverity): number {
  switch (s) {
    case 'critical':
      return 25;
    case 'high':
      return 15;
    case 'medium':
      return 8;
    case 'low':
      return 3;
    case 'info':
      return 0;
  }
}

/** Map numeric security score (0-100) to letter grade. */
export function scoreToGrade(score: number): SecurityGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/** Count findings by severity. */
export function countFindings(vulnerabilities: RawVulnerability[]): FindingsCount {
  const counts: FindingsCount = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const v of vulnerabilities) {
    counts[v.severity]++;
  }
  return counts;
}

/**
 * Compute security score (0-100) from vulnerability findings.
 * Starts at 100 and deducts based on severity of findings.
 */
export function computeSecurityScore(vulnerabilities: RawVulnerability[]): number {
  let score = 100;

  for (const v of vulnerabilities) {
    score -= severityWeight(v.severity);
  }

  return Math.max(0, Math.min(100, score));
}

/** Build a structured score breakdown. */
export interface ScoreBreakdown {
  score: number;
  grade: SecurityGrade;
  findings: FindingsCount;
  deductions: {
    severity: VulnerabilitySeverity;
    count: number;
    points: number;
  }[];
  summary: string;
}

export function buildScoreBreakdown(vulnerabilities: RawVulnerability[]): ScoreBreakdown {
  const score = computeSecurityScore(vulnerabilities);
  const grade = scoreToGrade(score);
  const findings = countFindings(vulnerabilities);

  const deductions: ScoreBreakdown['deductions'] = [];
  const severities: VulnerabilitySeverity[] = ['critical', 'high', 'medium', 'low', 'info'];

  for (const sev of severities) {
    const count = findings[sev];
    if (count > 0) {
      deductions.push({
        severity: sev,
        count,
        points: count * severityWeight(sev),
      });
    }
  }

  const totalVulns = vulnerabilities.length;
  const summary =
    totalVulns === 0
      ? `Security Score: ${score}/100 (${grade}) -- No vulnerabilities detected.`
      : `Security Score: ${score}/100 (${grade}) -- ${totalVulns} issue(s) found: ${findings.critical} critical, ${findings.high} high, ${findings.medium} medium, ${findings.low} low, ${findings.info} info.`;

  return { score, grade, findings, deductions, summary };
}
