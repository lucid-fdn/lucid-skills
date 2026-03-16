// ---------------------------------------------------------------------------
// provider.ts -- Audit provider interface
// ---------------------------------------------------------------------------

import type { Chain } from './common.js';

export interface AuditProvider {
  name: string;
  supportedChains: Chain[];
  isConfigured(): boolean;
  supportsChain(chain: Chain): boolean;
  fetchSource(address: string, chain: Chain): Promise<string | null>;
}
