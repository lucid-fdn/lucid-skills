import { describe, it, expect } from 'vitest';
import { runTriage } from './analysis.js';
import type { SentryIssue } from '../types/index.js';

function makeIssue(overrides: Partial<SentryIssue> = {}): SentryIssue {
  return {
    id: 'test-1',
    title: 'Error in worker process',
    level: 'error',
    count: 50,
    userCount: 5,
    firstSeen: new Date(Date.now() - 86_400_000).toISOString(),
    lastSeen: new Date().toISOString(),
    ...overrides,
  };
}

describe('runTriage', () => {
  it('returns a complete TriageResult', () => {
    const result = runTriage(makeIssue());
    expect(result.severity).toBeDefined();
    expect(result.category).toBeDefined();
    expect(result.temporalPattern).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.recommendation).toBeDefined();
  });

  it('scores severity correctly for fatal issue', () => {
    const result = runTriage(makeIssue({ level: 'fatal', count: 1 }));
    expect(result.severity).toBe('critical');
  });

  it('detects temporal pattern from timestamps', () => {
    const now = Date.now();
    const timestamps = [
      now,
      now + 600_000,
      now + 1_200_000,
      now + 1_800_000,
      now + 2_400_000,
      now + 3_000_000,
    ];
    const result = runTriage(makeIssue(), timestamps);
    expect(result.temporalPattern).toBe('steady');
  });

  it('returns unknown temporal when no timestamps provided', () => {
    const result = runTriage(makeIssue());
    expect(result.temporalPattern).toBe('unknown');
  });

  it('diagnoses litellm_timeout from title', () => {
    const result = runTriage(makeIssue({ title: 'LiteLLM timeout error' }));
    expect(result.category).toBe('litellm_timeout');
    expect(result.runbookRef).toBe('timeout');
  });

  it('builds recommendation with severity and pattern context', () => {
    const now = Date.now();
    const timestamps = [
      now,
      now + 60_000,
      now + 120_000,
      now + 180_000,
      now + 240_000,
      now + 300_000,
      now + 600_000,
      now + 900_000,
      now + 1_200_000,
      now + 7_200_000,
    ];
    const result = runTriage(
      makeIssue({ level: 'fatal', title: 'LiteLLM timeout' }),
      timestamps,
    );
    expect(result.recommendation).toContain('IMMEDIATE');
    expect(result.recommendation).toContain('BURST');
  });

  it('detects cross-service impact from tags', () => {
    const result = runTriage(makeIssue({
      tags: { trace_id: 'abc123', service: 'lucid-worker' },
    }));
    expect(result.crossServiceAffected).toBeDefined();
    expect(result.crossServiceAffected!.length).toBeGreaterThan(0);
  });

  it('returns no crossServiceAffected when no trace tags', () => {
    const result = runTriage(makeIssue({ tags: {} }));
    expect(result.crossServiceAffected).toBeUndefined();
  });
});
