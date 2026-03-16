// ---------------------------------------------------------------------------
// loader.ts -- Configuration loader: raw > env vars > defaults
// ---------------------------------------------------------------------------

import type { PluginConfig } from '../types/index.js';
import { CONFIG_DEFAULTS } from './defaults.js';
import { ConfigError } from '../utils/errors.js';

const ENV_MAP: Record<string, string> = {
  supabaseUrl: 'AUDIT_SUPABASE_URL',
  supabaseKey: 'AUDIT_SUPABASE_KEY',
  tenantId: 'AUDIT_TENANT_ID',
  etherscanApiKey: 'AUDIT_ETHERSCAN_API_KEY',
  slitherPath: 'AUDIT_SLITHER_PATH',
  mythrilPath: 'AUDIT_MYTHRIL_PATH',
  slackWebhookUrl: 'AUDIT_SLACK_WEBHOOK_URL',
  maxContractSize: 'AUDIT_MAX_CONTRACT_SIZE',
  scanSchedule: 'AUDIT_SCAN_SCHEDULE',
};

function envValue(key: string): string | undefined {
  const envKey = ENV_MAP[key];
  if (!envKey) return undefined;
  return process.env[envKey] || undefined;
}

let _cached: PluginConfig | undefined;

export function loadConfig(raw?: Partial<PluginConfig>): PluginConfig {
  const get = <K extends keyof PluginConfig>(key: K): PluginConfig[K] | undefined => {
    if (raw && raw[key] !== undefined) return raw[key];
    const env = envValue(key as string);
    if (env !== undefined) {
      if (key === 'maxContractSize') return parseInt(env, 10) as PluginConfig[K];
      return env as PluginConfig[K];
    }
    const def = (CONFIG_DEFAULTS as Record<string, unknown>)[key as string];
    if (def !== undefined) return def as PluginConfig[K];
    return undefined;
  };

  const supabaseUrl = get('supabaseUrl');
  const supabaseKey = get('supabaseKey');

  if (!supabaseUrl) {
    throw new ConfigError('supabaseUrl is required (set AUDIT_SUPABASE_URL or pass in config)');
  }
  if (!supabaseKey) {
    throw new ConfigError('supabaseKey is required (set AUDIT_SUPABASE_KEY or pass in config)');
  }

  const config: PluginConfig = {
    supabaseUrl,
    supabaseKey,
    tenantId: get('tenantId') ?? CONFIG_DEFAULTS.tenantId,
    maxContractSize: get('maxContractSize') ?? CONFIG_DEFAULTS.maxContractSize,
    scanSchedule: get('scanSchedule') ?? CONFIG_DEFAULTS.scanSchedule,
    ...(get('etherscanApiKey') && { etherscanApiKey: get('etherscanApiKey') }),
    ...(get('slitherPath') && { slitherPath: get('slitherPath') }),
    ...(get('mythrilPath') && { mythrilPath: get('mythrilPath') }),
    ...(get('slackWebhookUrl') && { slackWebhookUrl: get('slackWebhookUrl') }),
  };

  _cached = config;
  return config;
}

export function getConfig(): PluginConfig {
  if (!_cached) return loadConfig();
  return _cached;
}

export function resetConfig(): void {
  _cached = undefined;
}
