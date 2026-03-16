import type { ToolDefinition } from './types.js';
import type { PluginConfig, ProviderRegistry } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { upsertVerification } from '../db/emails.js';
import { logger } from '../utils/logger.js';

interface FindEmailsParams {
  domain: string;
  name?: string;
  limit?: number;
}

interface FindEmailsDeps {
  config: PluginConfig;
  db: SupabaseClient;
  registry: ProviderRegistry;
}

export function createFindEmailsTool(deps: FindEmailsDeps): ToolDefinition<FindEmailsParams> {
  return {
    name: 'prospect_find_emails',
    description:
      'Find email addresses at a company domain using Hunter.io and Apollo. Optionally filter by name. Verifies emails when possible.',
    params: {
      domain: { type: 'string', required: true, description: 'Company domain to search (e.g., "stripe.com")' },
      name: { type: 'string', required: false, description: 'Filter by person name' },
      limit: { type: 'number', required: false, min: 1, max: 100, default: 25, description: 'Maximum results' },
    },
    execute: async (params: FindEmailsParams): Promise<string> => {
      const { domain, name } = params;
      logger.info(`Finding emails for ${domain}${name ? ` (name: ${name})` : ''}`);

      const results = await deps.registry.findEmails(domain, name);
      const limited = results.slice(0, params.limit ?? 25);

      // Try to verify emails
      let verifiedCount = 0;
      for (const result of limited) {
        try {
          const verification = await deps.registry.verifyEmail(result.email);
          await upsertVerification(deps.db, result.email, verification.status, verification.provider, {
            mx_found: verification.mx_found,
            smtp_check: verification.smtp_check,
            is_catch_all: verification.is_catch_all,
            is_disposable: verification.is_disposable,
          });
          if (verification.status === 'valid') verifiedCount++;
        } catch {
          // Verification not available, skip
        }
      }

      const lines: string[] = [
        `## Emails Found at ${domain}`,
        `**Total:** ${limited.length} emails | **Verified:** ${verifiedCount}`,
        '',
        '| # | Email | Name | Position | Confidence | Source |',
        '|---|-------|------|----------|------------|--------|',
      ];

      for (let i = 0; i < limited.length; i++) {
        const r = limited[i];
        const displayName = [r.first_name, r.last_name].filter(Boolean).join(' ') || '-';
        lines.push(
          `| ${i + 1} | ${r.email} | ${displayName} | ${r.position ?? '-'} | ${r.confidence}% | ${r.source} |`,
        );
      }

      if (limited.length === 0) {
        lines.push('', '_No emails found for this domain._');
      }

      return lines.join('\n');
    },
  };
}
