// ---------------------------------------------------------------------------
// config.ts -- Plugin configuration interface
// ---------------------------------------------------------------------------

export interface PluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
  tenantId: string;

  // Provider API keys
  etherscanApiKey?: string;
  slitherPath?: string;
  mythrilPath?: string;

  // Notifications
  slackWebhookUrl?: string;

  // Limits
  maxContractSize: number;

  // Scheduling
  scanSchedule: string;
}
