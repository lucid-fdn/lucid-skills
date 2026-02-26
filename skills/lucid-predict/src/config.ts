// ---------------------------------------------------------------------------
// config.ts -- Configuration loader (Zod schema)
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const ConfigSchema = z.object({
  // -- Platform credentials (all optional) ------------------------------------
  polymarketApiUrl: z.string().url().default('https://gamma-api.polymarket.com'),
  manifoldApiUrl: z.string().url().default('https://api.manifold.markets/v0'),
  kalshiApiUrl: z.string().url().default('https://api.elections.kalshi.com/trade-api/v2'),
  kalshiApiKey: z.string().optional(),
  kalshiEmail: z.string().optional(),
  kalshiPassword: z.string().optional(),

  // -- Defaults ---------------------------------------------------------------
  defaultBankroll: z.coerce.number().default(10_000),
  defaultMaxFraction: z.coerce.number().default(0.25),
  minSpreadPct: z.coerce.number().default(3),

  // -- General settings -------------------------------------------------------
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type PluginConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): PluginConfig {
  return ConfigSchema.parse({
    polymarketApiUrl: env.PREDICT_POLYMARKET_API_URL,
    manifoldApiUrl: env.PREDICT_MANIFOLD_API_URL,
    kalshiApiUrl: env.PREDICT_KALSHI_API_URL,
    kalshiApiKey: env.PREDICT_KALSHI_API_KEY,
    kalshiEmail: env.PREDICT_KALSHI_EMAIL,
    kalshiPassword: env.PREDICT_KALSHI_PASSWORD,
    defaultBankroll: env.PREDICT_DEFAULT_BANKROLL,
    defaultMaxFraction: env.PREDICT_DEFAULT_MAX_FRACTION,
    minSpreadPct: env.PREDICT_MIN_SPREAD_PCT,
    logLevel: env.PREDICT_LOG_LEVEL,
  });
}
