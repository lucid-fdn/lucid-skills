import type { PluginConfig } from '../types/config.js';
import type { CostBasisMethod, TaxJurisdiction } from '../types/common.js';
import { COST_BASIS_METHODS, TAX_JURISDICTIONS } from '../types/common.js';
import { ConfigError } from '../utils/errors.js';

/**
 * Load plugin configuration from environment variables (TAX_ prefix).
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): PluginConfig {
  const supabaseUrl = env['TAX_SUPABASE_URL'];
  const supabaseKey = env['TAX_SUPABASE_KEY'];
  const tenantId = env['TAX_TENANT_ID'];

  if (!supabaseUrl) throw new ConfigError('TAX_SUPABASE_URL is required');
  if (!supabaseKey) throw new ConfigError('TAX_SUPABASE_KEY is required');
  if (!tenantId) throw new ConfigError('TAX_TENANT_ID is required');

  const rawJurisdiction = env['TAX_DEFAULT_JURISDICTION'] ?? 'us';
  if (!TAX_JURISDICTIONS.includes(rawJurisdiction as TaxJurisdiction)) {
    throw new ConfigError(`Invalid jurisdiction: ${rawJurisdiction}`);
  }

  const rawMethod = env['TAX_DEFAULT_COST_BASIS_METHOD'] ?? 'fifo';
  if (!COST_BASIS_METHODS.includes(rawMethod as CostBasisMethod)) {
    throw new ConfigError(`Invalid cost basis method: ${rawMethod}`);
  }

  const rawYear = env['TAX_YEAR'];
  const taxYear = rawYear ? parseInt(rawYear, 10) : new Date().getFullYear();
  if (Number.isNaN(taxYear) || taxYear < 2009 || taxYear > 2100) {
    throw new ConfigError(`Invalid tax year: ${rawYear}`);
  }

  return {
    supabaseUrl,
    supabaseKey,
    tenantId,
    etherscanApiKey: env['TAX_ETHERSCAN_API_KEY'],
    solscanApiKey: env['TAX_SOLSCAN_API_KEY'],
    birdeyeApiKey: env['TAX_BIRDEYE_API_KEY'],
    coingeckoApiKey: env['TAX_COINGECKO_API_KEY'],
    coinmarketcapApiKey: env['TAX_COINMARKETCAP_API_KEY'],
    defaultJurisdiction: rawJurisdiction as TaxJurisdiction,
    defaultCostBasisMethod: rawMethod as CostBasisMethod,
    taxYear,
    slackWebhookUrl: env['TAX_SLACK_WEBHOOK_URL'],
  };
}
