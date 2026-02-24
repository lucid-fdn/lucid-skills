// ---------------------------------------------------------------------------
// signal-classifier.test.ts -- Tests for ALL classification rules
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { classifySignal } from '../../../src/core/analysis/signal-classifier.js';
import type { SignalInsert } from '../../../src/core/types/index.js';

const base: SignalInsert = {
  tenant_id: 'default',
  competitor_id: '1',
  monitor_id: '1',
  signal_type: 'other',
  severity: 'medium',
  title: 'Test signal',
  metadata: {},
};

describe('classifySignal', () => {
  it('classifies pricing_change as critical', () => {
    expect(classifySignal({ ...base, signal_type: 'pricing_change' })).toBe('critical');
  });

  it('classifies content_change on pricing URL as critical', () => {
    expect(
      classifySignal({
        ...base,
        signal_type: 'content_change',
        url: 'https://example.com/pricing',
      }),
    ).toBe('critical');
  });

  it('classifies content_change on non-pricing URL as medium', () => {
    expect(
      classifySignal({
        ...base,
        signal_type: 'content_change',
        url: 'https://example.com/about',
      }),
    ).toBe('medium');
  });

  it('classifies large funding_round as critical', () => {
    expect(
      classifySignal({
        ...base,
        signal_type: 'funding_round',
        metadata: { amount: 50_000_000 },
      }),
    ).toBe('critical');
  });

  it('classifies small funding_round as high', () => {
    expect(
      classifySignal({
        ...base,
        signal_type: 'funding_round',
        metadata: { amount: 5_000_000 },
      }),
    ).toBe('high');
  });

  it('classifies feature_launch as high', () => {
    expect(classifySignal({ ...base, signal_type: 'feature_launch' })).toBe('high');
  });

  it('classifies major release as high', () => {
    expect(
      classifySignal({
        ...base,
        signal_type: 'release',
        metadata: { tag: 'v2.0.0' },
      }),
    ).toBe('high');
  });

  it('classifies minor release as medium', () => {
    expect(
      classifySignal({
        ...base,
        signal_type: 'release',
        metadata: { tag: 'v1.2.3' },
      }),
    ).toBe('medium');
  });

  it('classifies VP job posting as high', () => {
    expect(
      classifySignal({
        ...base,
        signal_type: 'job_posting',
        title: 'VP of Engineering',
      }),
    ).toBe('high');
  });

  it('classifies regular job posting as medium', () => {
    expect(
      classifySignal({
        ...base,
        signal_type: 'job_posting',
        title: 'Software Engineer',
      }),
    ).toBe('medium');
  });

  it('classifies review as medium', () => {
    expect(classifySignal({ ...base, signal_type: 'review' })).toBe('medium');
  });

  it('classifies social_mention as low', () => {
    expect(classifySignal({ ...base, signal_type: 'social_mention' })).toBe('low');
  });

  it('classifies news as medium', () => {
    expect(classifySignal({ ...base, signal_type: 'news' })).toBe('medium');
  });
});
