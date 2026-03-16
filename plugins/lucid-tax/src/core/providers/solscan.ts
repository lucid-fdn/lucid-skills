import { BaseProvider } from './base.js';
import type { RawTransaction, TransactionProvider, Chain } from '../types/index.js';
import { ProviderError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const SOLSCAN_API = 'https://pro-api.solscan.io/v2.0';

interface SolscanTx {
  txHash: string;
  signer: string[];
  fee: number;
  timestamp: number;
  blockNumber: number;
  tokenAddress?: string;
  tokenSymbol?: string;
  amount?: number;
  decimals?: number;
  from?: string;
  to?: string;
}

/**
 * Fetches Solana transaction history from Solscan API.
 */
export class SolscanProvider extends BaseProvider implements TransactionProvider {
  public readonly name = 'solscan';
  public readonly supportedChains: readonly Chain[] = ['solana'];
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super(2, 500);
    this.apiKey = apiKey;
  }

  async fetchTransactions(address: string, chain: Chain): Promise<RawTransaction[]> {
    if (chain !== 'solana') {
      throw new ProviderError(this.name, `Unsupported chain: ${chain}`);
    }

    logger.info(`Fetching Solana transactions for ${address}`);
    return this.schedule(async () => {
      const url = `${SOLSCAN_API}/account/transactions?address=${address}&limit=50`;
      const res = await fetch(url, {
        headers: { token: this.apiKey },
      });

      if (!res.ok) throw new ProviderError(this.name, `HTTP ${res.status}: ${res.statusText}`);

      const json = (await res.json()) as { data: SolscanTx[] };
      if (!Array.isArray(json.data)) return [];

      return json.data.map((tx): RawTransaction => {
        const decimals = tx.decimals ?? 9;
        const amount = (tx.amount ?? 0) / 10 ** decimals;

        return {
          hash: tx.txHash,
          chain: 'solana',
          from: tx.from ?? tx.signer[0] ?? '',
          to: tx.to ?? '',
          tokenAddress: tx.tokenAddress ?? null,
          tokenSymbol: tx.tokenSymbol ?? 'SOL',
          amount,
          feeNative: (tx.fee ?? 0) / 1e9,
          timestamp: tx.timestamp,
          blockNumber: tx.blockNumber,
        };
      });
    });
  }
}
