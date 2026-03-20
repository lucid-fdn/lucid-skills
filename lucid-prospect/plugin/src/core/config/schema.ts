import { Type, type Static } from '@sinclair/typebox';

export const ConfigSchema = Type.Object({
  supabaseUrl: Type.String({ description: 'Supabase project URL' }),
  supabaseKey: Type.String({ description: 'Supabase anon/service key' }),
  tenantId: Type.String({ description: 'Tenant identifier', default: 'default' }),
  apolloApiKey: Type.Optional(Type.String({ description: 'Apollo.io API key' })),
  hunterApiKey: Type.Optional(Type.String({ description: 'Hunter.io API key' })),
  clearbitApiKey: Type.Optional(Type.String({ description: 'Clearbit API key' })),
  linkedinCookie: Type.Optional(Type.String({ description: 'LinkedIn auth cookie' })),
  crunchbaseApiKey: Type.Optional(Type.String({ description: 'Crunchbase API key' })),
  slackWebhookUrl: Type.Optional(Type.String({ description: 'Slack webhook URL for notifications' })),
  defaultScoreThreshold: Type.Number({ description: 'Minimum score threshold for qualified leads', default: 50 }),
  enrichSchedule: Type.String({ description: 'Cron schedule for auto-enrichment', default: '0 2 * * *' }),
});

export type ConfigSchemaType = Static<typeof ConfigSchema>;
