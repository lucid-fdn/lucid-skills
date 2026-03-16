// ---------------------------------------------------------------------------
// schema.ts -- TypeBox schema for PluginConfig
// ---------------------------------------------------------------------------

import { Type, type Static } from '@sinclair/typebox';

/** TypeBox schema that mirrors the PluginConfig interface. */
export const PluginConfigSchema = Type.Object({
  supabaseUrl: Type.String({ minLength: 1 }),
  supabaseKey: Type.String({ minLength: 1 }),

  tenantId: Type.String({ default: 'default' }),

  fetchSchedule: Type.String({ default: '0 */6 * * *' }),
  briefSchedule: Type.String({ default: '0 9 * * 1' }),

  // Optional provider tokens
  githubToken: Type.Optional(Type.String()),
  twitterBearerToken: Type.Optional(Type.String()),

  // Alert delivery
  slackWebhookUrl: Type.Optional(Type.String()),
  alertWebhookUrl: Type.Optional(Type.String()),
  alertEmail: Type.Optional(Type.String()),

  // SMTP
  smtpHost: Type.Optional(Type.String()),
  smtpPort: Type.Optional(Type.Number()),
  smtpUser: Type.Optional(Type.String()),
  smtpPass: Type.Optional(Type.String()),

  alertSeverity: Type.Union(
    [
      Type.Literal('low'),
      Type.Literal('medium'),
      Type.Literal('high'),
      Type.Literal('critical'),
    ],
    { default: 'high' },
  ),
});

/** Inferred TypeBox static type (should be structurally identical to PluginConfig). */
export type PluginConfigFromSchema = Static<typeof PluginConfigSchema>;
