import type { ToolDefinition } from './types.js';
import type { PluginConfig } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listLeads } from '../db/leads.js';
import { formatPct } from '../utils/text.js';
import { daysAgo } from '../utils/date.js';
import { logger } from '../utils/logger.js';

interface GetInsightsParams {
  campaign_id?: string;
  days?: number;
}

interface GetInsightsDeps {
  config: PluginConfig;
  db: SupabaseClient;
}

export function createGetInsightsTool(deps: GetInsightsDeps): ToolDefinition<GetInsightsParams> {
  return {
    name: 'prospect_get_insights',
    description:
      'Get analytics and insights about your lead pipeline: conversion rates, lead flow, top sources, score distributions, and more.',
    params: {
      campaign_id: { type: 'string', required: false, description: 'Filter insights to a specific campaign' },
      days: { type: 'number', required: false, min: 1, max: 365, default: 30, description: 'Time range in days' },
    },
    execute: async (params: GetInsightsParams): Promise<string> => {
      const days = params.days ?? 30;
      logger.info(`Getting insights for last ${days} days`);

      const allLeads = await listLeads(deps.db, deps.config.tenantId, {
        campaign_id: params.campaign_id,
        limit: 1000,
      });

      const cutoff = daysAgo(days);
      const recentLeads = allLeads.filter((l) => new Date(l.created_at) >= cutoff);

      // Status distribution
      const statusCounts = new Map<string, number>();
      for (const lead of allLeads) {
        statusCounts.set(lead.status, (statusCounts.get(lead.status) ?? 0) + 1);
      }

      // Source distribution
      const sourceCounts = new Map<string, number>();
      for (const lead of allLeads) {
        sourceCounts.set(lead.lead_source, (sourceCounts.get(lead.lead_source) ?? 0) + 1);
      }

      // Top titles
      const titleCounts = new Map<string, number>();
      for (const lead of allLeads) {
        if (lead.title) {
          titleCounts.set(lead.title, (titleCounts.get(lead.title) ?? 0) + 1);
        }
      }

      // Top companies
      const companyCounts = new Map<string, number>();
      for (const lead of allLeads) {
        if (lead.company_name) {
          companyCounts.set(lead.company_name, (companyCounts.get(lead.company_name) ?? 0) + 1);
        }
      }

      // Score stats
      const scores = allLeads.map((l) => l.score);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

      // Conversion rate
      const converted = allLeads.filter((l) => l.status === 'converted').length;
      const conversionRate = allLeads.length > 0 ? converted / allLeads.length : 0;

      const topN = (map: Map<string, number>, n: number) =>
        [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

      const lines: string[] = [
        `## Pipeline Insights (last ${days} days)`,
        '',
        '### Overview',
        `- **Total Leads:** ${allLeads.length}`,
        `- **New (${days}d):** ${recentLeads.length}`,
        `- **Conversion Rate:** ${formatPct(conversionRate)}`,
        `- **Avg Score:** ${avgScore} | **Max Score:** ${maxScore}`,
        '',
        '### Status Breakdown',
        '| Status | Count | % |',
        '|--------|-------|---|',
      ];

      for (const [status, count] of topN(statusCounts, 10)) {
        const pct = allLeads.length > 0 ? formatPct(count / allLeads.length) : '0%';
        lines.push(`| ${status} | ${count} | ${pct} |`);
      }

      lines.push('', '### Top Sources', '| Source | Count |', '|--------|-------|');
      for (const [source, count] of topN(sourceCounts, 5)) {
        lines.push(`| ${source} | ${count} |`);
      }

      lines.push('', '### Top Titles', '| Title | Count |', '|-------|-------|');
      for (const [title, count] of topN(titleCounts, 5)) {
        lines.push(`| ${title} | ${count} |`);
      }

      lines.push('', '### Top Companies', '| Company | Leads |', '|---------|-------|');
      for (const [company, count] of topN(companyCounts, 5)) {
        lines.push(`| ${company} | ${count} |`);
      }

      return lines.join('\n');
    },
  };
}

