// ---------------------------------------------------------------------------
// config.ts -- Configuration loader (Zod schema, all credentials optional)
// ---------------------------------------------------------------------------

import { z } from 'zod';

/** Full plugin configuration schema */
export const ConfigSchema = z.object({
  // -- Before Quantum API --
  apiUrl: z.string().url().default('http://localhost:8000'),
  apiKey: z.string().default(''),
  adminSecret: z.string().default(''),

  // -- Timeouts --
  requestTimeout: z.coerce.number().default(30),

  // -- Agent identity (for credit tracking) --
  agentPassportId: z.string().optional(),

  // -- Memory persistence --
  memoryDir: z.string().optional(),

  // -- General settings --
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type PluginConfig = z.infer<typeof ConfigSchema>;

/**
 * Load configuration from environment variables.
 *
 * Env var naming convention:
 *   BQ_API_URL, BQ_API_KEY, BQ_ADMIN_SECRET
 *   QUANTUM_LOG_LEVEL, QUANTUM_AGENT_PASSPORT_ID
 *   QUANTUM_MEMORY_DIR
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): PluginConfig {
  return ConfigSchema.parse({
    apiUrl: env.BQ_API_URL,
    apiKey: env.BQ_API_KEY,
    adminSecret: env.BQ_ADMIN_SECRET,
    requestTimeout: env.BQ_MCP_TIMEOUT,
    agentPassportId: env.QUANTUM_AGENT_PASSPORT_ID,
    memoryDir: env.QUANTUM_MEMORY_DIR,
    logLevel: env.QUANTUM_LOG_LEVEL,
  });
}
