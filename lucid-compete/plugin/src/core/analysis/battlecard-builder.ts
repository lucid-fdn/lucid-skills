import type { Competitor, Signal, BattlecardPromptData } from '../types/index.js';
import { BATTLECARD_SYSTEM_PROMPT } from './prompts.js';

export function buildBattlecardPrompt(
  competitor: Competitor,
  signals: Signal[],
): BattlecardPromptData {
  // Group signals by type
  const grouped = new Map<string, Signal[]>();
  for (const s of signals) {
    const list = grouped.get(s.signal_type) ?? [];
    list.push(s);
    grouped.set(s.signal_type, list);
  }

  // Build user prompt
  const sections: string[] = [];
  sections.push(`# Battle Card: ${competitor.name}`);
  sections.push(`Website: ${competitor.website}`);
  if (competitor.description) sections.push(`Description: ${competitor.description}`);
  if (competitor.industry) sections.push(`Industry: ${competitor.industry}`);
  sections.push('');
  sections.push(`## Recent Signals (${signals.length} total)`);

  for (const [type, sigs] of grouped) {
    sections.push(`\n### ${type.replace(/_/g, ' ').toUpperCase()} (${sigs.length})`);
    for (const s of sigs.slice(0, 10)) {
      sections.push(`- **${s.title}** [${s.severity}] ${s.detected_at}`);
      if (s.summary) sections.push(`  ${s.summary}`);
    }
  }

  return {
    systemPrompt: BATTLECARD_SYSTEM_PROMPT,
    userPrompt: sections.join('\n'),
    competitorName: competitor.name,
    signalCount: signals.length,
  };
}
