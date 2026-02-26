// ---------------------------------------------------------------------------
// config.ts -- Configuration loader (Zod schema)
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const ConfigSchema = z.object({
  // -- General settings -------------------------------------------------------
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  environment: z.enum(['production', 'staging', 'development']).default('development'),
});

export type PluginConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): PluginConfig {
  return ConfigSchema.parse({
    logLevel: env.OBSERVABILITY_LOG_LEVEL,
    environment: env.OBSERVABILITY_ENVIRONMENT ?? env.LUCID_ENV ?? env.NODE_ENV,
  });
}
