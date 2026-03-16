import type { PluginConfig } from '../types/config.js';
import type { Chain, ProviderRegistry, TransactionProvider, PriceProvider } from '../types/index.js';
import { EtherscanProvider } from './etherscan.js';
import { SolscanProvider } from './solscan.js';
import { CoinGeckoProvider } from './coingecko.js';
import { CoinMarketCapProvider } from './coinmarketcap.js';
import { logger } from '../utils/logger.js';

/**
 * Create a provider registry from configuration.
 */
export function createProviderRegistry(config: PluginConfig): ProviderRegistry {
  const transactionProviders: TransactionProvider[] = [];
  const priceProviders: PriceProvider[] = [];

  // Register transaction providers
  if (config.etherscanApiKey) {
    transactionProviders.push(new EtherscanProvider(config.etherscanApiKey));
    logger.info('Registered Etherscan provider (EVM chains)');
  }

  if (config.solscanApiKey) {
    transactionProviders.push(new SolscanProvider(config.solscanApiKey));
    logger.info('Registered Solscan provider (Solana)');
  }

  // Register price providers
  priceProviders.push(new CoinGeckoProvider(config.coingeckoApiKey));
  logger.info('Registered CoinGecko price provider');

  if (config.coinmarketcapApiKey) {
    priceProviders.push(new CoinMarketCapProvider(config.coinmarketcapApiKey));
    logger.info('Registered CoinMarketCap price provider (backup)');
  }

  return {
    transactionProviders,
    priceProviders,
    getTransactionProvider(chain: Chain): TransactionProvider | undefined {
      return transactionProviders.find((p) => p.supportedChains.includes(chain));
    },
    getPriceProvider(): PriceProvider | undefined {
      return priceProviders[0];
    },
  };
}

export { EtherscanProvider } from './etherscan.js';
export { SolscanProvider } from './solscan.js';
export { CoinGeckoProvider } from './coingecko.js';
export { CoinMarketCapProvider } from './coinmarketcap.js';
export { BaseProvider } from './base.js';
