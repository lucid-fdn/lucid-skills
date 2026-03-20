// ---------------------------------------------------------------------------
// schema.ts -- Config schema definition
// ---------------------------------------------------------------------------

export interface ConfigSchema {
  supabaseUrl: { env: string; required: true };
  supabaseKey: { env: string; required: true };
  tenantId: { env: string; required: false; default: string };
  etherscanApiKey: { env: string; required: false };
  slitherPath: { env: string; required: false };
  mythrilPath: { env: string; required: false };
  slackWebhookUrl: { env: string; required: false };
  maxContractSize: { env: string; required: false; default: number };
  scanSchedule: { env: string; required: false; default: string };
}

export const CONFIG_SCHEMA: ConfigSchema = {
  supabaseUrl: { env: 'AUDIT_SUPABASE_URL', required: true },
  supabaseKey: { env: 'AUDIT_SUPABASE_KEY', required: true },
  tenantId: { env: 'AUDIT_TENANT_ID', required: false, default: 'default' },
  etherscanApiKey: { env: 'AUDIT_ETHERSCAN_API_KEY', required: false },
  slitherPath: { env: 'AUDIT_SLITHER_PATH', required: false },
  mythrilPath: { env: 'AUDIT_MYTHRIL_PATH', required: false },
  slackWebhookUrl: { env: 'AUDIT_SLACK_WEBHOOK_URL', required: false },
  maxContractSize: { env: 'AUDIT_MAX_CONTRACT_SIZE', required: false, default: 50000 },
  scanSchedule: { env: 'AUDIT_SCAN_SCHEDULE', required: false, default: '0 */6 * * *' },
};
