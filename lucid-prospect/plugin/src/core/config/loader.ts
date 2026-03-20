import type { PluginConfig } from '../types/index.js';
import { ConfigError } from '../utils/errors.js';
import { CONFIG_DEFAULTS } from './defaults.js';

const ENV_MAP: Record<string, keyof PluginConfig> = {
  PROSPECT_SUPABASE_URL: 'supabaseUrl',
  PROSPECT_SUPABASE_KEY: 'supabaseKey',
  PROSPECT_TENANT_ID: 'tenantId',
  PROSPECT_APOLLO_API_KEY: 'apolloApiKey',
  PROSPECT_HUNTER_API_KEY: 'hunterApiKey',
  PROSPECT_CLEARBIT_API_KEY: 'clearbitApiKey',
  PROSPECT_LINKEDIN_COOKIE: 'linkedinCookie',
  PROSPECT_CRUNCHBASE_API_KEY: 'crunchbaseApiKey',
  PROSPECT_SLACK_WEBHOOK_URL: 'slackWebhookUrl',
  PROSPECT_DEFAULT_SCORE_THRESHOLD: 'defaultScoreThreshold',
  PROSPECT_ENRICH_SCHEDULE: 'enrichSchedule',
};

function readEnv(): Partial<PluginConfig> {
  const partial: Record<string, unknown> = {};
  for (const [envKey, configKey] of Object.entries(ENV_MAP)) {
    const val = process.env[envKey];
    if (val !== undefined) {
      if (configKey === 'defaultScoreThreshold') {
        partial[configKey] = parseInt(val, 10);
      } else {
        partial[configKey] = val;
      }
    }
  }
  return partial as Partial<PluginConfig>;
}

export function loadConfig(overrides?: Partial<PluginConfig>): PluginConfig {
  const envValues = readEnv();
  const merged = { ...CONFIG_DEFAULTS, ...envValues, ...overrides } as PluginConfig;

  if (!merged.supabaseUrl) {
    throw new ConfigError('supabaseUrl is required (set PROSPECT_SUPABASE_URL)', 'supabaseUrl');
  }
  if (!merged.supabaseKey) {
    throw new ConfigError('supabaseKey is required (set PROSPECT_SUPABASE_KEY)', 'supabaseKey');
  }

  return merged;
}
