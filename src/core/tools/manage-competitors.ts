// ---------------------------------------------------------------------------
// manage-competitors.ts -- CRUD tools for competitor management
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { PluginConfig, MonitorType } from '../types/index.js';
import {
  createCompetitor,
  listCompetitors,
  updateCompetitor,
  deleteCompetitor,
  createMonitor,
} from '../db/index.js';
import { log } from '../utils/index.js';

interface CompetitorDeps {
  config: PluginConfig;
}

// ---------------------------------------------------------------------------
// Add Competitor
// ---------------------------------------------------------------------------

interface AddCompetitorParams {
  name: string;
  website: string;
  description?: string;
  industry?: string;
}

export function createAddCompetitorTool(deps: CompetitorDeps): ToolDefinition {
  return {
    name: 'compete_add_competitor',
    description:
      'Add a new competitor to track. Automatically discovers monitorable endpoints (pricing pages, RSS feeds).',
    params: {
      name: {
        type: 'string',
        required: true,
        description: 'The name of the competitor',
      },
      website: {
        type: 'string',
        required: true,
        description: 'The competitor website URL (e.g. https://example.com)',
      },
      description: {
        type: 'string',
        required: false,
        description: 'A brief description of the competitor',
      },
      industry: {
        type: 'string',
        required: false,
        description: 'The industry the competitor operates in',
      },
    },
    execute: async (params: AddCompetitorParams): Promise<string> => {
      try {
        const competitor = await createCompetitor({
          tenant_id: deps.config.tenantId,
          name: params.name,
          website: params.website,
          description: params.description,
          industry: params.industry,
        });

        // Auto-discovery: probe common endpoints (best-effort)
        const discovered: string[] = [];
        const baseUrl = params.website.replace(/\/+$/, '');

        // Check pricing page
        try {
          const pricingUrl = `${baseUrl}/pricing`;
          const res = await fetch(pricingUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          if (res.ok) {
            await createMonitor({
              tenant_id: deps.config.tenantId,
              competitor_id: competitor.id,
              monitor_type: 'web-diff' as MonitorType,
              url: pricingUrl,
              config: {},
              enabled: true,
            });
            discovered.push(`web-diff: ${pricingUrl}`);
          }
        } catch {
          // Ignore probe failures
        }

        // Check for changelog / blog RSS
        for (const path of ['/changelog', '/blog']) {
          try {
            const pageUrl = `${baseUrl}${path}`;
            const res = await fetch(pageUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            if (res.ok) {
              await createMonitor({
                tenant_id: deps.config.tenantId,
                competitor_id: competitor.id,
                monitor_type: 'rss' as MonitorType,
                url: pageUrl,
                config: {},
                enabled: true,
              });
              discovered.push(`rss: ${pageUrl}`);
            }
          } catch {
            // Ignore probe failures
          }
        }

        const lines = [
          `Competitor "${competitor.name}" created (id: ${competitor.id}).`,
        ];
        if (discovered.length > 0) {
          lines.push(`Auto-discovered monitors:`);
          for (const d of discovered) {
            lines.push(`  - ${d}`);
          }
        } else {
          lines.push('No monitors were auto-discovered. Add monitors manually.');
        }
        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_add_competitor failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// List Competitors
// ---------------------------------------------------------------------------

interface ListCompetitorsParams {
  industry?: string;
}

export function createListCompetitorsTool(deps: CompetitorDeps): ToolDefinition {
  return {
    name: 'compete_list_competitors',
    description: 'List all tracked competitors, optionally filtered by industry.',
    params: {
      industry: {
        type: 'string',
        required: false,
        description: 'Filter by industry',
      },
    },
    execute: async (params: ListCompetitorsParams): Promise<string> => {
      try {
        let competitors = await listCompetitors(deps.config.tenantId);

        if (params.industry) {
          competitors = competitors.filter(
            (c) => c.industry?.toLowerCase() === params.industry!.toLowerCase(),
          );
        }

        if (competitors.length === 0) {
          return 'No competitors found.';
        }

        const lines = [`Competitors (${competitors.length}):`];
        for (const c of competitors) {
          const parts = [`  - [${c.id}] ${c.name} (${c.website})`];
          if (c.industry) parts.push(`industry: ${c.industry}`);
          lines.push(parts.join(' | '));
        }
        return lines.join('\n');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_list_competitors failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Update Competitor
// ---------------------------------------------------------------------------

interface UpdateCompetitorParams {
  id: number;
  name?: string;
  website?: string;
  description?: string;
  industry?: string;
}

export function createUpdateCompetitorTool(_deps: CompetitorDeps): ToolDefinition {
  return {
    name: 'compete_update_competitor',
    description: 'Update an existing competitor\'s details.',
    params: {
      id: {
        type: 'number',
        required: true,
        description: 'The competitor ID to update',
      },
      name: {
        type: 'string',
        required: false,
        description: 'New name for the competitor',
      },
      website: {
        type: 'string',
        required: false,
        description: 'New website URL',
      },
      description: {
        type: 'string',
        required: false,
        description: 'New description',
      },
      industry: {
        type: 'string',
        required: false,
        description: 'New industry',
      },
    },
    execute: async (params: UpdateCompetitorParams): Promise<string> => {
      try {
        const updates: Record<string, unknown> = {};
        if (params.name !== undefined) updates.name = params.name;
        if (params.website !== undefined) updates.website = params.website;
        if (params.description !== undefined) updates.description = params.description;
        if (params.industry !== undefined) updates.industry = params.industry;

        const updated = await updateCompetitor(params.id, updates);
        return `Competitor "${updated.name}" (id: ${updated.id}) updated successfully.`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_update_competitor failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Remove Competitor
// ---------------------------------------------------------------------------

interface RemoveCompetitorParams {
  id: number;
}

export function createRemoveCompetitorTool(_deps: CompetitorDeps): ToolDefinition {
  return {
    name: 'compete_remove_competitor',
    description:
      'Remove a competitor and all associated monitors and signals (cascading delete).',
    params: {
      id: {
        type: 'number',
        required: true,
        description: 'The competitor ID to remove',
      },
    },
    execute: async (params: RemoveCompetitorParams): Promise<string> => {
      try {
        await deleteCompetitor(params.id);
        return `Competitor (id: ${params.id}) removed successfully.`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('compete_remove_competitor failed', msg);
        return `Error: ${msg}`;
      }
    },
  };
}
