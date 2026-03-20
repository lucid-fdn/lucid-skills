// ---------------------------------------------------------------------------
// loader.ts -- Configuration loader: raw > env vars > defaults
// ---------------------------------------------------------------------------

import type { PluginConfig } from '../types/index.js';
import { CONFIG_DEFAULTS } from './defaults.js';
import { ConfigError } from '../utils/errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map from PluginConfig keys to the corresponding `COMPETE_*` env var name.
 * Only keys that can be read from the environment are listed.
 */
const ENV_MAP: Record<string, string> = {
  supabaseUrl: 'COMPETE_SUPABASE_URL',
  supabaseKey: 'COMPETE_SUPABASE_KEY',
  tenantId: 'COMPETE_TENANT_ID',
  fetchSchedule: 'COMPETE_FETCH_SCHEDULE',
  briefSchedule: 'COMPETE_BRIEF_SCHEDULE',
  githubToken: 'COMPETE_GITHUB_TOKEN',
  twitterBearerToken: 'COMPETE_TWITTER_BEARER_TOKEN',
  slackWebhookUrl: 'COMPETE_SLACK_WEBHOOK_URL',
  alertWebhookUrl: 'COMPETE_ALERT_WEBHOOK_URL',
  alertEmail: 'COMPETE_ALERT_EMAIL',
  smtpHost: 'COMPETE_SMTP_HOST',
  smtpPort: 'COMPETE_SMTP_PORT',
  smtpUser: 'COMPETE_SMTP_USER',
  smtpPass: 'COMPETE_SMTP_PASS',
  alertSeverity: 'COMPETE_ALERT_SEVERITY',
};

/** Read a value from process.env using the COMPETE_ prefix mapping. */
function envValue(key: string): string | undefined {
  const envKey = ENV_MAP[key];
  if (!envKey) return undefined;
  return process.env[envKey] || undefined;
}

// ---------------------------------------------------------------------------
// Cached singleton
// ---------------------------------------------------------------------------

let _cached: PluginConfig | undefined;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a fully-resolved `PluginConfig`.
 *
 * Resolution order (first defined wins): `raw` > env vars > defaults.
 */
export function loadConfig(raw?: Partial<PluginConfig>): PluginConfig {
  const get = <K extends keyof PluginConfig>(key: K): PluginConfig[K] | undefined => {
    // 1. raw overrides
    if (raw && raw[key] !== undefined) return raw[key];
    // 2. env var
    const env = envValue(key as string);
    if (env !== undefined) {
      // Handle numeric fields
      if (key === 'smtpPort') return Number(env) as PluginConfig[K];
      return env as PluginConfig[K];
    }
    // 3. defaults
    const def = (CONFIG_DEFAULTS as Record<string, unknown>)[key as string];
    if (def !== undefined) return def as PluginConfig[K];
    return undefined;
  };

  const supabaseUrl = get('supabaseUrl');
  const supabaseKey = get('supabaseKey');

  if (!supabaseUrl) {
    throw new ConfigError('supabaseUrl is required (set COMPETE_SUPABASE_URL or pass in config)');
  }
  if (!supabaseKey) {
    throw new ConfigError('supabaseKey is required (set COMPETE_SUPABASE_KEY or pass in config)');
  }

  const config: PluginConfig = {
    supabaseUrl,
    supabaseKey,
    tenantId: get('tenantId') ?? CONFIG_DEFAULTS.tenantId,
    fetchSchedule: get('fetchSchedule') ?? CONFIG_DEFAULTS.fetchSchedule,
    briefSchedule: get('briefSchedule') ?? CONFIG_DEFAULTS.briefSchedule,
    alertSeverity: get('alertSeverity') ?? CONFIG_DEFAULTS.alertSeverity,
    // Optional fields -- only set if present
    ...(get('githubToken') && { githubToken: get('githubToken') }),
    ...(get('twitterBearerToken') && { twitterBearerToken: get('twitterBearerToken') }),
    ...(get('slackWebhookUrl') && { slackWebhookUrl: get('slackWebhookUrl') }),
    ...(get('alertWebhookUrl') && { alertWebhookUrl: get('alertWebhookUrl') }),
    ...(get('alertEmail') && { alertEmail: get('alertEmail') }),
    ...(get('smtpHost') && { smtpHost: get('smtpHost') }),
    ...(get('smtpPort') && { smtpPort: get('smtpPort') }),
    ...(get('smtpUser') && { smtpUser: get('smtpUser') }),
    ...(get('smtpPass') && { smtpPass: get('smtpPass') }),
  };

  _cached = config;
  return config;
}

/**
 * Return the cached config, loading from env/defaults if never loaded before.
 */
export function getConfig(): PluginConfig {
  if (!_cached) return loadConfig();
  return _cached;
}

/**
 * Clear the cached config so the next `getConfig()` re-evaluates.
 */
export function resetConfig(): void {
  _cached = undefined;
}
