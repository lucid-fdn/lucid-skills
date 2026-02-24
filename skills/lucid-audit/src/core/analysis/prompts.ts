// ---------------------------------------------------------------------------
// prompts.ts -- AI-ready prompt templates for deeper analysis
// ---------------------------------------------------------------------------

import type { ScoreBreakdown } from './security-scorer.js';
import type { RawVulnerability } from './vulnerability-detector.js';
import type { GasAnalysisResult } from './gas-analyzer.js';

export const AUDIT_REPORT_SYSTEM_PROMPT = `You are a smart contract security auditor. Analyze the vulnerability findings and gas optimization data provided, and generate a clear, actionable security audit report. Focus on:

1. **Overall Assessment**: Is this contract safe to deploy/interact with? Clear verdict.
2. **Critical Issues**: The most severe vulnerabilities explained in plain English.
3. **Access Control**: Are privileged functions properly protected?
4. **Reentrancy Safety**: Is the contract protected against reentrancy attacks?
5. **Gas Efficiency**: Key gas optimization opportunities.
6. **Recommendations**: Prioritized action items for the developer.

Be direct and specific. Reference specific findings from the scan results.`;

export function buildAuditReportPrompt(
  contractName: string,
  score: ScoreBreakdown,
  vulnerabilities: RawVulnerability[],
  gasAnalysis: GasAnalysisResult,
): string {
  const sections: string[] = [];

  sections.push(`## Contract: ${contractName}`);
  sections.push(`- **Security Score**: ${score.score}/100 (Grade: ${score.grade})`);
  sections.push(
    `- **Findings**: ${score.findings.critical} critical, ${score.findings.high} high, ${score.findings.medium} medium, ${score.findings.low} low, ${score.findings.info} info`,
  );
  sections.push('');

  if (vulnerabilities.length > 0) {
    sections.push('## Vulnerability Findings');
    for (const v of vulnerabilities) {
      sections.push(`### [${v.severity.toUpperCase()}] ${v.title}`);
      sections.push(`- Category: ${v.category}`);
      sections.push(`- Location: ${v.location}`);
      sections.push(`- Description: ${v.description}`);
      sections.push(`- Recommendation: ${v.recommendation}`);
      if (v.cwe_id) sections.push(`- CWE: ${v.cwe_id}`);
      sections.push('');
    }
  }

  if (gasAnalysis.issues.length > 0) {
    sections.push('## Gas Optimization');
    sections.push(`- Total issues: ${gasAnalysis.issues.length}`);
    sections.push(`- Estimated savings: ~${gasAnalysis.totalEstimatedSavings} gas`);
    sections.push('');
    for (const g of gasAnalysis.issues) {
      sections.push(`- **${g.title}** (${g.location}): ${g.description}`);
    }
    sections.push('');
  }

  sections.push('Please provide your comprehensive security audit analysis based on this data.');

  return sections.join('\n');
}
