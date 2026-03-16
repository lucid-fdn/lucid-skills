// ---------------------------------------------------------------------------
// math/diagnosis.ts -- Diagnosis pattern matching engine
// ---------------------------------------------------------------------------
// Implements the 12 diagnosis patterns from
// skills/triage/references/diagnosis-patterns.md

import type { DiagnosisCategory, DiagnosisResult } from '../types/index.js';

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

interface DiagnosisPattern {
  id: DiagnosisCategory;
  keywords: string[];
  recommendation: string;
  runbook?: string;
}

const PATTERNS: DiagnosisPattern[] = [
  // Lucid-specific patterns (checked first)
  {
    id: 'litellm_timeout',
    keywords: ['litellm', 'timeout', 'llm proxy'],
    recommendation: 'Check LiteLLM fallback routes, switch to streaming',
    runbook: 'timeout',
  },
  {
    id: 'openmeter_timeout',
    keywords: ['openmeter', 'metering', 'outbox', 'aborterror'],
    recommendation: 'Verify timeoutMs=5000, check outbox health',
    runbook: 'metering-failure',
  },
  {
    id: 'privy_auth',
    keywords: ['privy', 'auth.privy.io'],
    recommendation: 'Verify NEXT_PUBLIC_PRIVY_APP_ID is set and Privy status page is green',
    runbook: 'auth-error',
  },
  {
    id: 'mcp_server_down',
    keywords: ['mcp', 'tool_execute', 'econnrefused', 'mcp server'],
    recommendation: 'Check MCP server health endpoint and MCPGate registry',
    runbook: 'network-error',
  },

  // Built-in patterns
  {
    id: 'network_error',
    keywords: ['fetch failed', 'econnrefused', 'enotfound', 'econnreset', 'network'],
    recommendation: 'Check upstream provider health, add retry with exponential backoff',
    runbook: 'network-error',
  },
  {
    id: 'timeout',
    keywords: ['timeout', 'aborterror', 'abort', 'deadline'],
    recommendation: 'Switch to streaming for long operations, check connection pool utilization',
    runbook: 'timeout',
  },
  {
    id: 'auth_error',
    keywords: ['unauthorized', '401', '403', 'forbidden', 'auth'],
    recommendation: 'Check if API keys have expired, verify auth configuration',
    runbook: 'auth-error',
  },
  {
    id: 'rate_limit',
    keywords: ['rate', '429', 'quota', 'too many'],
    recommendation: 'Review quota/rate limit settings, add request queuing',
    runbook: 'rate-limit',
  },
  {
    id: 'database_error',
    keywords: ['database', 'postgres', 'unique constraint', 'deadlock', 'connection'],
    recommendation: 'Verify database connectivity, review connection pool config',
    runbook: 'database-error',
  },
  {
    id: 'validation_error',
    keywords: ['validation', 'zod', 'parse', 'schema'],
    recommendation: 'Review API schema, return validation errors in API response',
    runbook: 'validation-error',
  },
  {
    id: 'memory_leak',
    keywords: ['heap', 'out of memory', 'oom'],
    recommendation: 'Take heap snapshot, verify streams are closed',
    runbook: 'memory-leak',
  },
  // application_error is the fallback — no keywords
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Diagnose an issue by matching title, culprit, and stack trace against
 * known patterns. First match wins. Falls back to 'application_error'.
 *
 * Confidence scoring:
 * - 3+ keyword matches: 0.95
 * - 2 matches: 0.80
 * - 1 match: 0.60
 * - 0 matches (fallback): 0.20
 */
export function diagnoseIssue(
  title: string,
  culprit?: string,
  stackTrace?: string,
): DiagnosisResult {
  const searchText = [title, culprit ?? '', stackTrace ?? ''].join(' ').toLowerCase();

  for (const pattern of PATTERNS) {
    const matched = pattern.keywords.filter((kw) => searchText.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      const confidence = matched.length >= 3 ? 0.95 : matched.length === 2 ? 0.80 : 0.60;
      return {
        category: pattern.id,
        confidence,
        matchedKeywords: matched,
        recommendation: pattern.recommendation,
        runbook: pattern.runbook,
      };
    }
  }

  // Fallback: application_error
  return {
    category: 'application_error',
    confidence: 0.20,
    matchedKeywords: [],
    recommendation: 'Examine the full stack trace, add breadcrumbs around the error',
    runbook: undefined,
  };
}
