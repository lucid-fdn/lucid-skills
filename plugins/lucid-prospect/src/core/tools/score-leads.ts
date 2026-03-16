import type { ToolDefinition } from './types.js';
import type { PluginConfig } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listLeads, updateLead } from '../db/leads.js';
import { getVerification } from '../db/emails.js';
import { scoreLead } from '../analysis/lead-scorer.js';
import { logger } from '../utils/logger.js';

interface ScoreLeadsParams {
  campaign_id?: string;
  min_score?: number;
  rescore?: boolean;
}

interface ScoreLeadsDeps {
  config: PluginConfig;
  db: SupabaseClient;
}

export function createScoreLeadsTool(deps: ScoreLeadsDeps): ToolDefinition<ScoreLeadsParams> {
  return {
    name: 'prospect_score_leads',
    description:
      'Score all leads (or campaign-specific leads) using multi-factor scoring: email quality (30%), title relevance (25%), company fit (25%), engagement (10%), recency (10%). Updates scores in the database.',
    params: {
      campaign_id: { type: 'string', required: false, description: 'Score only leads in this campaign' },
      min_score: { type: 'number', required: false, min: 0, max: 100, description: 'Only return leads above this score' },
      rescore: { type: 'boolean', required: false, default: false, description: 'Re-score all leads even if already scored' },
    },
    execute: async (params: ScoreLeadsParams): Promise<string> => {
      logger.info(`Scoring leads${params.campaign_id ? ` for campaign ${params.campaign_id}` : ''}`);

      const leads = await listLeads(deps.db, deps.config.tenantId, {
        campaign_id: params.campaign_id,
        limit: 500,
      });

      const scoreBuckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      let scored = 0;
      let skipped = 0;

      for (const lead of leads) {
        if (!params.rescore && lead.score > 0) {
          skipped++;
          continue;
        }

        // Get email verification status
        let emailStatus: 'valid' | 'invalid' | 'catch_all' | 'unknown' | 'disposable' | undefined;
        if (lead.email) {
          try {
            const verification = await getVerification(deps.db, lead.email);
            if (verification) {
              emailStatus = verification.status;
            }
          } catch {
            // Skip verification lookup errors
          }
        }

        const breakdown = scoreLead(lead, undefined, emailStatus);
        await updateLead(deps.db, lead.id, { score: breakdown.total });
        scored++;

        if (breakdown.total <= 20) scoreBuckets['0-20']++;
        else if (breakdown.total <= 40) scoreBuckets['21-40']++;
        else if (breakdown.total <= 60) scoreBuckets['41-60']++;
        else if (breakdown.total <= 80) scoreBuckets['61-80']++;
        else scoreBuckets['81-100']++;
      }

      const avg = scored > 0
        ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length)
        : 0;

      const lines: string[] = [
        `## Lead Scoring Complete`,
        '',
        `**Scored:** ${scored} | **Skipped:** ${skipped} | **Average Score:** ${avg}`,
        '',
        '### Score Distribution',
        '| Range | Count |',
        '|-------|-------|',
      ];

      for (const [range, count] of Object.entries(scoreBuckets)) {
        const bar = '#'.repeat(Math.min(count, 30));
        lines.push(`| ${range} | ${count} ${bar} |`);
      }

      if (params.min_score !== undefined) {
        const qualified = Object.entries(scoreBuckets)
          .filter(([range]) => {
            const low = parseInt(range.split('-')[0]);
            return low >= (params.min_score ?? 0);
          })
          .reduce((sum, [, count]) => sum + count, 0);
        lines.push('', `**Qualified (>=${params.min_score}):** ${qualified} leads`);
      }

      return lines.join('\n');
    },
  };
}
