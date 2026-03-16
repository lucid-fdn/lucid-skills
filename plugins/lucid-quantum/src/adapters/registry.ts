// ---------------------------------------------------------------------------
// adapters/registry.ts -- Adapter registry for BQ API access
// ---------------------------------------------------------------------------

import type { PluginConfig } from '../config.js';
import type { IBqAdapter } from './types.js';
import { BqApiAdapter } from './bq-api.js';

export class AdapterRegistry {
  private adapter: IBqAdapter | null = null;

  configure(config: PluginConfig): void {
    this.adapter = new BqApiAdapter({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      adminSecret: config.adminSecret,
      timeout: config.requestTimeout,
    });
  }

  getApi(): IBqAdapter {
    if (!this.adapter) {
      throw new Error('BQ API adapter not configured. Set BQ_API_URL and BQ_API_KEY env vars.');
    }
    return this.adapter;
  }
}
