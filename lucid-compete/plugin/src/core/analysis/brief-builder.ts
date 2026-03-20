import type { Competitor, Signal, BriefPromptData, BriefType } from '../types/index.js';
import { BRIEF_SYSTEM_PROMPT } from './prompts.js';

export function buildBriefPrompt(
  competitors: Competitor[],
  signals: Signal[],
  briefType: BriefType,
): BriefPromptData {
  // Sort signals by severity (critical first) then by date
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...signals].sort((a, b) => {
    const sevDiff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
  });

  // Build user prompt
  const competitorMap = new Map(competitors.map(c => [c.id, c]));
  const sections: string[] = [];
  sections.push(`# Competitive Intel Brief (${briefType})`);
  sections.push(`Period: ${briefType === 'weekly' ? 'Last 7 days' : 'Last 30 days'}`);
  sections.push(`Competitors tracked: ${competitors.length}`);
  sections.push(`Total signals: ${signals.length}`);
  sections.push('');

  // Critical signals first
  const critical = sorted.filter(s => s.severity === 'critical' || s.severity === 'high');
  if (critical.length > 0) {
    sections.push('## HIGH PRIORITY SIGNALS');
    for (const s of critical.slice(0, 20)) {
      const comp = competitorMap.get(s.competitor_id);
      sections.push(`- [${s.severity.toUpperCase()}] **${comp?.name ?? 'Unknown'}**: ${s.title}`);
      if (s.summary) sections.push(`  ${s.summary}`);
    }
  }

  // Per-competitor breakdown
  sections.push('\n## PER-COMPETITOR BREAKDOWN');
  for (const comp of competitors) {
    const compSignals = sorted.filter(s => s.competitor_id === comp.id);
    if (compSignals.length === 0) continue;
    sections.push(`\n### ${comp.name} (${compSignals.length} signals)`);
    for (const s of compSignals.slice(0, 10)) {
      sections.push(`- [${s.severity}] ${s.signal_type}: ${s.title}`);
    }
  }

  return {
    systemPrompt: BRIEF_SYSTEM_PROMPT,
    userPrompt: sections.join('\n'),
    briefType,
    competitorCount: competitors.length,
    signalCount: signals.length,
  };
}
