import type { Chain } from './common.js';

/** Raw transaction as returned by a blockchain data provider */
export interface RawTransaction {
  hash: string;
  chain: Chain;
  from: string;
  to: string;
  tokenAddress: string | null;
  tokenSymbol: string;
  amount: number;
  feeNative: number;
  timestamp: number;
  blockNumber: number;
  methodId?: string;
  functionName?: string;
}

/** Historical price record returned by a price provider */
export interface PricePoint {
  tokenSymbol: string;
  date: string;
  priceUsd: number;
  source: string;
}

/** Interface for blockchain data providers */
export interface TransactionProvider {
  readonly name: string;
  readonly supportedChains: readonly Chain[];
  fetchTransactions(address: string, chain: Chain): Promise<RawTransaction[]>;
}

/** Interface for historical price providers */
export interface PriceProvider {
  readonly name: string;
  fetchPrice(tokenSymbol: string, date: string): Promise<PricePoint | null>;
  fetchPriceRange(
    tokenSymbol: string,
    startDate: string,
    endDate: string,
  ): Promise<PricePoint[]>;
}

/** Registry holding all available providers */
export interface ProviderRegistry {
  transactionProviders: TransactionProvider[];
  priceProviders: PriceProvider[];
  getTransactionProvider(chain: Chain): TransactionProvider | undefined;
  getPriceProvider(): PriceProvider | undefined;
}
