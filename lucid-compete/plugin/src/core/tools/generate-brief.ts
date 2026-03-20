// ---------------------------------------------------------------------------
// generate-brief.ts -- Tool to generate periodic intelligence briefs
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { PluginConfig, BriefType } from '../types/index.js';
import { BRIEF_TYPES } from '../types/index.js';
import { listCompetitors, listSignals, createBrief } from '../db/index.js';
import { buildBriefPrompt } from '../analysis/index.js';
import { log, toISODate } from '../utils/index.js';

interface BriefDeps {
  config: PluginConfig;
}

interface GenerateBriefParams {
  brief_type: string;
  date?: string;
}

export function createGenerateBriefTool(deps: BriefDeps): ToolDefinition {
  return {
    name: 'compete_generate_brief',
    description:
      'Generate a competitive intelligence brief (weekly or monthly) summarizing recent signals across all competitors.',
    params: {
      brief_type: {
        type: 'enum',
        required: true,
        description: 'The type of brief to generate',
        values: [...BRIEF_TYPES],
      },
      date: {
        type: 'string',
        required: false,
        description: 'The date for the brief (YYYY-MM-DD, defaults to today)',
      },
    },
    execute: async (params: GenerateBriefParams): Promise<string> => {
      try {
        const briefType = params.brief_type as BriefType;
        const date = params.date ?? toISODate();
        const daysBack = briefType === 'weekly' ? 7 : 30;

        const [competitors, signals] = await Promise.all([
          listCompetitors(deps.config.tenantId),
          listSignals(deps.config.tenantId, { daysBack }),
        ]);

        const promptData = buildBriefPrompt(competitors, signals, briefType);

        // Store brief record in DB
        await createBrief({
          tenant_id: deps.config.tenantId,
          brief_type: briefType,
          date,
          markdown: promptData.userPrompt,
          signal_count: promptData.signalCount,
          competitor_count: promptData.competitorCount,
          generated_at: new Date().toISOString(),
        });

        return JSON.stringify(promptData, null, 2);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_generate_brief failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}
