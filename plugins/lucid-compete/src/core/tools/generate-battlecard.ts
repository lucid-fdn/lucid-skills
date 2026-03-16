// ---------------------------------------------------------------------------
// generate-battlecard.ts -- Tool to generate a competitor battlecard
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { PluginConfig } from '../types/index.js';
import { getCompetitor, listSignals, createBattlecard } from '../db/index.js';
import { buildBattlecardPrompt } from '../analysis/index.js';
import { log } from '../utils/index.js';

interface BattlecardDeps {
  config: PluginConfig;
}

interface GenerateBattlecardParams {
  competitor_id: number;
  days_back?: number;
}

export function createGenerateBattlecardTool(deps: BattlecardDeps): ToolDefinition {
  return {
    name: 'compete_generate_battlecard',
    description:
      'Generate a competitive battlecard for a specific competitor based on recent signals.',
    params: {
      competitor_id: {
        type: 'number',
        required: true,
        description: 'The competitor ID to generate a battlecard for',
      },
      days_back: {
        type: 'number',
        required: false,
        description: 'Number of days of signal history to include (default: 30)',
        default: 30,
      },
    },
    execute: async (params: GenerateBattlecardParams): Promise<string> => {
      try {
        const competitor = await getCompetitor(params.competitor_id);
        if (!competitor) {
          return `Error: Competitor with id ${params.competitor_id} not found.`;
        }

        const signals = await listSignals(deps.config.tenantId, {
          competitorId: params.competitor_id,
          daysBack: params.days_back ?? 30,
        });

        const promptData = buildBattlecardPrompt(competitor, signals);

        // Store battlecard record in DB
        await createBattlecard({
          tenant_id: deps.config.tenantId,
          competitor_id: competitor.id,
          markdown: promptData.userPrompt,
          signal_count: promptData.signalCount,
          generated_at: new Date().toISOString(),
        });

        return JSON.stringify(promptData, null, 2);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_generate_battlecard failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}
