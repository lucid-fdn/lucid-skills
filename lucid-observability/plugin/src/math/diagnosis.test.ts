import { describe, it, expect } from 'vitest';
import { diagnoseIssue } from './diagnosis.js';

describe('diagnoseIssue', () => {
  // Lucid-specific patterns
  it('matches litellm_timeout', () => {
    const result = diagnoseIssue('LiteLLM timeout: proxy request failed');
    expect(result.category).toBe('litellm_timeout');
    expect(result.matchedKeywords).toContain('litellm');
    expect(result.matchedKeywords).toContain('timeout');
    expect(result.confidence).toBeGreaterThanOrEqual(0.80);
  });

  it('matches openmeter_timeout', () => {
    const result = diagnoseIssue('AbortError: OpenMeter metering request timed out');
    expect(result.category).toBe('openmeter_timeout');
    expect(result.matchedKeywords).toContain('openmeter');
    expect(result.runbook).toBe('metering-failure');
  });

  it('matches privy_auth', () => {
    const result = diagnoseIssue('Request to auth.privy.io failed');
    expect(result.category).toBe('privy_auth');
    expect(result.matchedKeywords).toContain('auth.privy.io');
  });

  it('matches mcp_server_down', () => {
    const result = diagnoseIssue('tool_execute failed: ECONNREFUSED to MCP server');
    expect(result.category).toBe('mcp_server_down');
    expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(2);
  });

  // Built-in patterns
  it('matches network_error', () => {
    const result = diagnoseIssue('fetch failed: ENOTFOUND api.example.com');
    expect(result.category).toBe('network_error');
    expect(result.matchedKeywords).toContain('fetch failed');
  });

  it('matches timeout (generic)', () => {
    const result = diagnoseIssue('Request deadline exceeded');
    expect(result.category).toBe('timeout');
    expect(result.matchedKeywords).toContain('deadline');
  });

  it('matches auth_error', () => {
    const result = diagnoseIssue('Unauthorized: 401 access denied');
    expect(result.category).toBe('auth_error');
    expect(result.matchedKeywords).toContain('unauthorized');
  });

  it('matches rate_limit', () => {
    const result = diagnoseIssue('HTTP 429 Too Many Requests');
    expect(result.category).toBe('rate_limit');
    expect(result.matchedKeywords).toContain('429');
  });

  it('matches database_error', () => {
    const result = diagnoseIssue('postgres unique constraint violation on users');
    expect(result.category).toBe('database_error');
    expect(result.matchedKeywords).toContain('postgres');
  });

  it('matches validation_error', () => {
    const result = diagnoseIssue('Zod parse error: invalid schema input');
    expect(result.category).toBe('validation_error');
    expect(result.matchedKeywords).toContain('zod');
  });

  it('matches memory_leak', () => {
    const result = diagnoseIssue('JavaScript heap out of memory');
    expect(result.category).toBe('memory_leak');
    expect(result.matchedKeywords).toContain('heap');
  });

  it('falls back to application_error when no pattern matches', () => {
    const result = diagnoseIssue('Cannot read property x of undefined');
    expect(result.category).toBe('application_error');
    expect(result.confidence).toBe(0.20);
    expect(result.matchedKeywords).toHaveLength(0);
  });

  it('searches culprit and stackTrace too', () => {
    const result = diagnoseIssue(
      'Something went wrong',
      'worker/src/metering.ts',
      'Error at openmeter client: outbox flush failed',
    );
    expect(result.category).toBe('openmeter_timeout');
    expect(result.matchedKeywords).toContain('openmeter');
  });

  it('confidence increases with more keyword matches', () => {
    const result1 = diagnoseIssue('litellm error');
    const result2 = diagnoseIssue('litellm timeout on llm proxy');
    expect(result2.confidence).toBeGreaterThan(result1.confidence);
  });

  it('Lucid-specific patterns take priority over built-in', () => {
    // "litellm timeout" should match litellm_timeout, not generic timeout
    const result = diagnoseIssue('litellm timeout');
    expect(result.category).toBe('litellm_timeout');
  });
});
