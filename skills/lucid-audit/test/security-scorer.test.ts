// ---------------------------------------------------------------------------
// security-scorer.test.ts -- Tests for security scoring
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  computeSecurityScore,
  scoreToGrade,
  severityWeight,
  countFindings,
  buildScoreBreakdown,
} from '../src/core/analysis/security-scorer.js';
import type { RawVulnerability } from '../src/core/analysis/vulnerability-detector.js';

function makeVuln(severity: RawVulnerability['severity']): RawVulnerability {
  return {
    category: 'reentrancy',
    severity,
    title: `Test ${severity}`,
    description: 'Test description',
    location: 'Line 1',
    recommendation: 'Fix it',
    cwe_id: null,
  };
}

describe('severityWeight', () => {
  it('returns 25 for critical', () => {
    expect(severityWeight('critical')).toBe(25);
  });

  it('returns 15 for high', () => {
    expect(severityWeight('high')).toBe(15);
  });

  it('returns 8 for medium', () => {
    expect(severityWeight('medium')).toBe(8);
  });

  it('returns 3 for low', () => {
    expect(severityWeight('low')).toBe(3);
  });

  it('returns 0 for info', () => {
    expect(severityWeight('info')).toBe(0);
  });
});

describe('scoreToGrade', () => {
  it('returns A for score >= 90', () => {
    expect(scoreToGrade(90)).toBe('A');
    expect(scoreToGrade(100)).toBe('A');
  });

  it('returns B for score 75-89', () => {
    expect(scoreToGrade(75)).toBe('B');
    expect(scoreToGrade(89)).toBe('B');
  });

  it('returns C for score 60-74', () => {
    expect(scoreToGrade(60)).toBe('C');
    expect(scoreToGrade(74)).toBe('C');
  });

  it('returns D for score 40-59', () => {
    expect(scoreToGrade(40)).toBe('D');
    expect(scoreToGrade(59)).toBe('D');
  });

  it('returns F for score < 40', () => {
    expect(scoreToGrade(0)).toBe('F');
    expect(scoreToGrade(39)).toBe('F');
  });
});

describe('countFindings', () => {
  it('counts findings by severity', () => {
    const vulns = [
      makeVuln('critical'),
      makeVuln('critical'),
      makeVuln('high'),
      makeVuln('medium'),
      makeVuln('low'),
      makeVuln('info'),
      makeVuln('info'),
    ];
    const counts = countFindings(vulns);
    expect(counts.critical).toBe(2);
    expect(counts.high).toBe(1);
    expect(counts.medium).toBe(1);
    expect(counts.low).toBe(1);
    expect(counts.info).toBe(2);
  });

  it('returns all zeros for empty array', () => {
    const counts = countFindings([]);
    expect(counts.critical).toBe(0);
    expect(counts.high).toBe(0);
    expect(counts.medium).toBe(0);
    expect(counts.low).toBe(0);
    expect(counts.info).toBe(0);
  });
});

describe('computeSecurityScore', () => {
  it('returns 100 for no vulnerabilities', () => {
    expect(computeSecurityScore([])).toBe(100);
  });

  it('deducts 25 for one critical', () => {
    expect(computeSecurityScore([makeVuln('critical')])).toBe(75);
  });

  it('deducts 15 for one high', () => {
    expect(computeSecurityScore([makeVuln('high')])).toBe(85);
  });

  it('deducts for multiple findings', () => {
    const vulns = [makeVuln('critical'), makeVuln('high'), makeVuln('medium')];
    // 100 - 25 - 15 - 8 = 52
    expect(computeSecurityScore(vulns)).toBe(52);
  });

  it('never goes below 0', () => {
    const vulns = Array(10).fill(null).map(() => makeVuln('critical'));
    expect(computeSecurityScore(vulns)).toBe(0);
  });

  it('info findings do not reduce score', () => {
    const vulns = [makeVuln('info'), makeVuln('info'), makeVuln('info')];
    expect(computeSecurityScore(vulns)).toBe(100);
  });
});

describe('buildScoreBreakdown', () => {
  it('returns full breakdown structure', () => {
    const vulns = [makeVuln('critical'), makeVuln('high')];
    const breakdown = buildScoreBreakdown(vulns);

    expect(breakdown.score).toBe(60);
    expect(breakdown.grade).toBe('C');
    expect(breakdown.findings.critical).toBe(1);
    expect(breakdown.findings.high).toBe(1);
    expect(breakdown.deductions.length).toBe(2);
    expect(breakdown.summary).toContain('60/100');
  });

  it('returns clean summary for no vulnerabilities', () => {
    const breakdown = buildScoreBreakdown([]);
    expect(breakdown.score).toBe(100);
    expect(breakdown.grade).toBe('A');
    expect(breakdown.summary).toContain('No vulnerabilities');
  });
});
