// ---------------------------------------------------------------------------
// prompts.test.ts -- Tests for AI prompt templates
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { REVENUE_REPORT_PROMPT, INVOICE_PROMPT } from '../../src/analysis/prompts.js';

describe('REVENUE_REPORT_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof REVENUE_REPORT_PROMPT).toBe('string');
    expect(REVENUE_REPORT_PROMPT.length).toBeGreaterThan(50);
  });

  it('contains data placeholder', () => {
    expect(REVENUE_REPORT_PROMPT).toContain('{{data}}');
  });

  it('mentions MRR', () => {
    expect(REVENUE_REPORT_PROMPT).toContain('MRR');
  });

  it('mentions ARR', () => {
    expect(REVENUE_REPORT_PROMPT).toContain('ARR');
  });
});

describe('INVOICE_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof INVOICE_PROMPT).toBe('string');
    expect(INVOICE_PROMPT.length).toBeGreaterThan(50);
  });

  it('contains context placeholder', () => {
    expect(INVOICE_PROMPT).toContain('{{context}}');
  });

  it('contains request placeholder', () => {
    expect(INVOICE_PROMPT).toContain('{{request}}');
  });
});
