export {
  fullVulnerabilityScan,
  detectReentrancy,
  detectAccessControl,
  detectOverflow,
  detectUncheckedReturn,
  detectFrontRunning,
  detectOracleManipulation,
  detectFlashLoan,
  detectLogicErrors,
  detectCentralization,
  type RawVulnerability,
} from './vulnerability-detector.js';

export {
  fullGasAnalysis,
  detectStorageInLoops,
  detectUnnecessarySloads,
  detectPackingIssues,
  detectLoopOptimizations,
  detectVisibilityOptimizations,
  detectMiscGasIssues,
  type GasIssue,
  type GasAnalysisResult,
} from './gas-analyzer.js';

export {
  computeSecurityScore,
  scoreToGrade,
  severityWeight,
  countFindings,
  buildScoreBreakdown,
  type ScoreBreakdown,
} from './security-scorer.js';

export { AUDIT_REPORT_SYSTEM_PROMPT, buildAuditReportPrompt } from './prompts.js';
