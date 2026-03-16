import type { ToolDefinition } from './types.js';
import type { PluginConfig, LeadStatus, Lead } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LEAD_STATUSES } from '../types/common.js';
import { listLeads } from '../db/leads.js';
import { logger } from '../utils/logger.js';

interface ExportLeadsParams {
  campaign_id?: string;
  format: 'csv' | 'json' | 'markdown';
  min_score?: number;
  status?: LeadStatus;
}

interface ExportLeadsDeps {
  config: PluginConfig;
  db: SupabaseClient;
}

export function createExportLeadsTool(deps: ExportLeadsDeps): ToolDefinition<ExportLeadsParams> {
  return {
    name: 'prospect_export_leads',
    description:
      'Export leads in CSV, JSON, or Markdown format. Filter by campaign, minimum score, or status.',
    params: {
      format: { type: 'enum', required: true, values: ['csv', 'json', 'markdown'], description: 'Export format' },
      campaign_id: { type: 'string', required: false, description: 'Export only leads from this campaign' },
      min_score: { type: 'number', required: false, min: 0, max: 100, description: 'Minimum lead score' },
      status: { type: 'enum', required: false, values: [...LEAD_STATUSES], description: 'Filter by lead status' },
    },
    execute: async (params: ExportLeadsParams): Promise<string> => {
      logger.info(`Exporting leads as ${params.format}`);

      const leads = await listLeads(deps.db, deps.config.tenantId, {
        campaign_id: params.campaign_id,
        minScore: params.min_score,
        status: params.status,
        limit: 1000,
      });

      switch (params.format) {
        case 'csv':
          return formatCsv(leads);
        case 'json':
          return formatJson(leads);
        case 'markdown':
          return formatMarkdown(leads);
      }
    },
  };
}

function formatCsv(leads: Lead[]): string {
  const headers = ['email', 'first_name', 'last_name', 'title', 'company', 'domain', 'phone', 'score', 'status', 'source'];
  const lines = [headers.join(',')];

  for (const lead of leads) {
    const row = [
      csvEscape(lead.email ?? ''),
      csvEscape(lead.first_name ?? ''),
      csvEscape(lead.last_name ?? ''),
      csvEscape(lead.title ?? ''),
      csvEscape(lead.company_name ?? ''),
      csvEscape(lead.company_domain ?? ''),
      csvEscape(lead.phone ?? ''),
      String(lead.score),
      lead.status,
      lead.lead_source,
    ];
    lines.push(row.join(','));
  }

  return `## CSV Export (${leads.length} leads)\n\n\`\`\`csv\n${lines.join('\n')}\n\`\`\``;
}

function formatJson(leads: Lead[]): string {
  const data = leads.map((lead) => ({
    email: lead.email,
    first_name: lead.first_name,
    last_name: lead.last_name,
    title: lead.title,
    company: lead.company_name,
    domain: lead.company_domain,
    phone: lead.phone,
    linkedin: lead.linkedin_url,
    score: lead.score,
    status: lead.status,
    source: lead.lead_source,
  }));

  return `## JSON Export (${leads.length} leads)\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}

function formatMarkdown(leads: Lead[]): string {
  const lines: string[] = [
    `## Lead Export (${leads.length} leads)`,
    '',
    '| # | Name | Title | Company | Email | Score | Status |',
    '|---|------|-------|---------|-------|-------|--------|',
  ];

  for (let i = 0; i < leads.length; i++) {
    const l = leads[i];
    const name = [l.first_name, l.last_name].filter(Boolean).join(' ') || '-';
    lines.push(`| ${i + 1} | ${name} | ${l.title ?? '-'} | ${l.company_name ?? '-'} | ${l.email ?? '-'} | ${l.score} | ${l.status} |`);
  }

  return lines.join('\n');
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
