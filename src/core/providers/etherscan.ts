// ---------------------------------------------------------------------------
// etherscan.ts -- Etherscan-compatible block explorer provider
// ---------------------------------------------------------------------------

import type { Chain } from '../types/common.js';
import type { AuditProvider } from '../types/provider.js';
import type { PluginConfig } from '../types/config.js';
import { ProviderError } from '../utils/errors.js';
import { log } from '../utils/logger.js';

const CHAIN_ENDPOINTS: Record<string, string> = {
  ethereum: 'https://api.etherscan.io/api',
  bsc: 'https://api.bscscan.com/api',
  arbitrum: 'https://api.arbiscan.io/api',
  base: 'https://api.basescan.org/api',
  polygon: 'https://api.polygonscan.com/api',
  optimism: 'https://api-optimistic.etherscan.io/api',
  avalanche: 'https://api.snowtrace.io/api',
};

const SUPPORTED: Chain[] = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'base'];

export function createEtherscanProvider(config: PluginConfig): AuditProvider {
  const apiKey = config.etherscanApiKey;

  return {
    name: 'etherscan',
    supportedChains: SUPPORTED,

    isConfigured(): boolean {
      return !!apiKey;
    },

    supportsChain(chain: Chain): boolean {
      return chain in CHAIN_ENDPOINTS;
    },

    async fetchSource(address: string, chain: Chain): Promise<string | null> {
      const baseUrl = CHAIN_ENDPOINTS[chain];
      if (!baseUrl) {
        log.warn(`Etherscan: chain '${chain}' not supported`);
        return null;
      }

      const url = new URL(baseUrl);
      url.searchParams.set('module', 'contract');
      url.searchParams.set('action', 'getsourcecode');
      url.searchParams.set('address', address);
      if (apiKey) url.searchParams.set('apikey', apiKey);

      log.debug('Fetching source from Etherscan', { chain, address });

      try {
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new ProviderError('etherscan', `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as Record<string, unknown>;
        if (data['status'] !== '1' || !Array.isArray(data['result'])) {
          return null;
        }

        const result = data['result'][0] as Record<string, string> | undefined;
        if (!result || !result['SourceCode'] || result['SourceCode'] === '') {
          return null;
        }

        return result['SourceCode'];
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        log.error('Etherscan fetch failed', err);
        return null;
      }
    },
  };
}
