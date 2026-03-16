export interface PluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
  tenantId: string;
  apolloApiKey?: string;
  hunterApiKey?: string;
  clearbitApiKey?: string;
  linkedinCookie?: string;
  crunchbaseApiKey?: string;
  slackWebhookUrl?: string;
  defaultScoreThreshold: number;
  enrichSchedule: string;
}
