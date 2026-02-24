// ---------------------------------------------------------------------------
// battlecard-builder.test.ts -- Tests for prompt structure
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { buildBattlecardPrompt } from '../../../src/core/analysis/battlecard-builder.js';
import { mockCompetitor, mockSignal } from '../../helpers/fixtures.js';

describe('buildBattlecardPrompt', () => {
  it('builds prompt with competitor info and signals', () => {
    const result = buildBattlecardPrompt(mockCompetitor, [mockSignal]);
    expect(result.systemPrompt).toContain('battle card');
    expect(result.userPrompt).toContain(mockCompetitor.name);
    expect(result.userPrompt).toContain(mockCompetitor.website);
    expect(result.competitorName).toBe(mockCompetitor.name);
    expect(result.signalCount).toBe(1);
  });

  it('groups signals by type', () => {
    const signals = [
      { ...mockSignal, signal_type: 'pricing_change' as const },
      { ...mockSignal, id: '2', signal_type: 'release' as const, title: 'New release' },
    ];
    const result = buildBattlecardPrompt(mockCompetitor, signals);
    expect(result.userPrompt).toContain('PRICING CHANGE');
    expect(result.userPrompt).toContain('RELEASE');
    expect(result.signalCount).toBe(2);
  });

  it('handles empty signals', () => {
    const result = buildBattlecardPrompt(mockCompetitor, []);
    expect(result.signalCount).toBe(0);
    expect(result.userPrompt).toContain('0 total');
  });
});
