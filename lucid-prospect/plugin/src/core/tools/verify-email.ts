import type { ToolDefinition } from './types.js';
import type { PluginConfig, ProviderRegistry } from '../types/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { upsertVerification, getVerification } from '../db/emails.js';
import { logger } from '../utils/logger.js';

interface VerifyEmailParams {
  email: string;
}

interface VerifyEmailDeps {
  config: PluginConfig;
  db: SupabaseClient;
  registry: ProviderRegistry;
}

export function createVerifyEmailTool(deps: VerifyEmailDeps): ToolDefinition<VerifyEmailParams> {
  return {
    name: 'prospect_verify_email',
    description:
      'Verify an email address using Hunter.io or other configured providers. Checks MX records, SMTP, catch-all, and disposable status.',
    params: {
      email: { type: 'string', required: true, description: 'Email address to verify' },
    },
    execute: async (params: VerifyEmailParams): Promise<string> => {
      const { email } = params;
      logger.info(`Verifying email: ${email}`);

      // Check cache first
      const cached = await getVerification(deps.db, email);
      if (cached) {
        const cacheAge = Date.now() - new Date(cached.verified_at).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (cacheAge < oneDayMs) {
          return formatVerificationResult(email, cached.status, cached.provider ?? 'cache', {
            mx_found: cached.mx_found ?? false,
            smtp_check: cached.smtp_check ?? false,
            is_catch_all: cached.is_catch_all,
            is_disposable: cached.is_disposable,
          }, true);
        }
      }

      const result = await deps.registry.verifyEmail(email);

      await upsertVerification(deps.db, email, result.status, result.provider, {
        mx_found: result.mx_found,
        smtp_check: result.smtp_check,
        is_catch_all: result.is_catch_all,
        is_disposable: result.is_disposable,
      });

      return formatVerificationResult(email, result.status, result.provider, {
        mx_found: result.mx_found,
        smtp_check: result.smtp_check,
        is_catch_all: result.is_catch_all,
        is_disposable: result.is_disposable,
      }, false);
    },
  };
}

function formatVerificationResult(
  email: string,
  status: string,
  provider: string,
  details: { mx_found: boolean; smtp_check: boolean; is_catch_all: boolean; is_disposable: boolean },
  fromCache: boolean,
): string {
  const statusEmoji: Record<string, string> = {
    valid: 'VALID',
    invalid: 'INVALID',
    catch_all: 'CATCH-ALL',
    unknown: 'UNKNOWN',
    disposable: 'DISPOSABLE',
  };

  const lines: string[] = [
    `## Email Verification: ${email}`,
    '',
    `**Status:** ${statusEmoji[status] ?? status.toUpperCase()}${fromCache ? ' (cached)' : ''}`,
    '',
    '| Check | Result |',
    '|-------|--------|',
    `| MX Records | ${details.mx_found ? 'Found' : 'Not Found'} |`,
    `| SMTP Check | ${details.smtp_check ? 'Pass' : 'Fail'} |`,
    `| Catch-All | ${details.is_catch_all ? 'Yes' : 'No'} |`,
    `| Disposable | ${details.is_disposable ? 'Yes' : 'No'} |`,
    `| Provider | ${provider} |`,
  ];

  return lines.join('\n');
}
