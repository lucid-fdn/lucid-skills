import type { CostBasisMethod, TaxJurisdiction } from './common.js';

export interface PluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
  tenantId: string;

  /** Optional API keys for data providers */
  etherscanApiKey?: string;
  solscanApiKey?: string;
  birdeyeApiKey?: string;
  coingeckoApiKey?: string;
  coinmarketcapApiKey?: string;

  /** Default tax jurisdiction (default: 'us') */
  defaultJurisdiction: TaxJurisdiction;

  /** Default cost basis method (default: 'fifo') */
  defaultCostBasisMethod: CostBasisMethod;

  /** Tax year to calculate (default: current year) */
  taxYear: number;

  /** Slack webhook for notifications */
  slackWebhookUrl?: string;
}

export function getDefaultConfig(): Partial<PluginConfig> {
  return {
    defaultJurisdiction: 'us',
    defaultCostBasisMethod: 'fifo',
    taxYear: new Date().getFullYear(),
  };
}
