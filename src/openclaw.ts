// ---------------------------------------------------------------------------
// Lucid Invoice — OpenClaw Adapter
// ---------------------------------------------------------------------------

import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION } from './core/plugin-id.js';
import { loadConfig } from './core/config-loader.js';
import { initDbClient } from './db/client.js';
import { createToolRegistry } from './tools/handlers.js';
import type { InvoiceConfig } from './types/config.js';

/**
 * OpenClaw-compatible plugin export.
 * Provides metadata and tool definitions for dynamic registration.
 */
export function register(overrides?: Partial<InvoiceConfig>) {
  const config = loadConfig(overrides);
  initDbClient(config);
  const tools = createToolRegistry();

  return {
    id: PLUGIN_ID,
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      handler: t.handler,
    })),
  };
}

export default register;
