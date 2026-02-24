import type { PluginConfig } from '../types/config.js';
import type { AuditProvider } from '../types/provider.js';
import { createEtherscanProvider } from './etherscan.js';

export interface ProviderRegistry {
  providers: AuditProvider[];
  getConfigured(): AuditProvider[];
}

export function createProviderRegistry(config: PluginConfig): ProviderRegistry {
  const providers: AuditProvider[] = [createEtherscanProvider(config)];

  return {
    providers,
    getConfigured() {
      return providers.filter((p) => p.isConfigured());
    },
  };
}

export { createEtherscanProvider } from './etherscan.js';
