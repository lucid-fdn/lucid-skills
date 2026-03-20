import { Cron } from 'croner';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PluginConfig, ProviderRegistry } from '../types/index.js';
import { listLeads, updateLead } from '../db/leads.js';
import { logEnrichment } from '../db/enrichments.js';
import { getLatestEnrichment } from '../db/enrichments.js';
import { scoreLead } from '../analysis/lead-scorer.js';
import { getVerification } from '../db/emails.js';
import { daysAgo } from '../utils/date.js';
import { logger } from '../utils/logger.js';

export interface SchedulerOptions {
  config: PluginConfig;
  db: SupabaseClient;
  registry: ProviderRegistry;
}

export class ProspectScheduler {
  private enrichJob: Cron | null = null;
  private scoreJob: Cron | null = null;
  private readonly opts: SchedulerOptions;

  constructor(opts: SchedulerOptions) {
    this.opts = opts;
  }

  start(): void {
    logger.info('Starting prospect scheduler');

    // Auto-enrich job
    this.enrichJob = new Cron(this.opts.config.enrichSchedule, async () => {
      await this.runAutoEnrich();
    });

    // Auto-score job (daily at 3 AM)
    this.scoreJob = new Cron('0 3 * * *', async () => {
      await this.runAutoScore();
    });

    logger.info(`Enrich job scheduled: ${this.opts.config.enrichSchedule}`);
    logger.info('Score job scheduled: 0 3 * * *');
  }

  stop(): void {
    this.enrichJob?.stop();
    this.scoreJob?.stop();
    this.enrichJob = null;
    this.scoreJob = null;
    logger.info('Prospect scheduler stopped');
  }

  async runAutoEnrich(): Promise<number> {
    logger.info('Running auto-enrichment');
    const { db, config, registry } = this.opts;

    const leads = await listLeads(db, config.tenantId, { limit: 100 });
    const sevenDaysAgo = daysAgo(7);
    let enriched = 0;

    for (const lead of leads) {
      if (!lead.email) continue;

      // Check if enriched recently
      try {
        const latest = await getLatestEnrichment(db, 'lead', lead.id);
        if (latest && new Date(latest.created_at) > sevenDaysAgo) {
          continue;
        }
      } catch {
        // No enrichment found, proceed
      }

      try {
        const data = await registry.enrichLead(lead.email);
        await updateLead(db, lead.id, {
          enrichment_data: { ...lead.enrichment_data, ...data } as Record<string, unknown>,
        });
        await logEnrichment(db, config.tenantId, 'lead', lead.id, data.provider, data as Record<string, unknown>);
        enriched++;
      } catch (err) {
        logger.warn(`Auto-enrich failed for ${lead.email}:`, err);
      }
    }

    logger.info(`Auto-enrichment complete: ${enriched} leads enriched`);
    return enriched;
  }

  async runAutoScore(): Promise<number> {
    logger.info('Running auto-scoring');
    const { db, config } = this.opts;

    const leads = await listLeads(db, config.tenantId, { limit: 500 });
    let scored = 0;

    for (const lead of leads) {
      try {
        let emailStatus: 'valid' | 'invalid' | 'catch_all' | 'unknown' | 'disposable' | undefined;
        if (lead.email) {
          const verification = await getVerification(db, lead.email);
          if (verification) {
            emailStatus = verification.status;
          }
        }

        const breakdown = scoreLead(lead, undefined, emailStatus);
        if (breakdown.total !== lead.score) {
          await updateLead(db, lead.id, { score: breakdown.total });
          scored++;
        }
      } catch (err) {
        logger.warn(`Auto-score failed for lead ${lead.id}:`, err);
      }
    }

    logger.info(`Auto-scoring complete: ${scored} leads re-scored`);
    return scored;
  }
}
