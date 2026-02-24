import { BaseProvider } from './base.js';
import type { Chain, RawTransaction, TransactionProvider } from '../types/index.js';
import { ProviderError } from '../utils/errors.js';
import { joinUrl, appendParams } from '../utils/url.js';
import { logger } from '../utils/logger.js';

/** Map of EVM chains to their Etherscan-compatible API base URLs */
const CHAIN_API_URLS: Partial<Record<Chain, string>> = {
  ethereum: 'https://api.etherscan.io/api',
  bsc: 'https://api.bscscan.com/api',
  polygon: 'https://api.polygonscan.com/api',
  arbitrum: 'https://api.arbiscan.io/api',
  base: 'https://api.basescan.org/api',
  avalanche: 'https://api.snowtrace.io/api',
};

const EVM_CHAINS: Chain[] = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'avalanche'];

interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  tokenSymbol: string;
  tokenDecimal: string;
  gasUsed: string;
  gasPrice: string;
  timeStamp: string;
  blockNumber: string;
  methodId: string;
  functionName: string;
}

/**
 * Fetches transactions from Etherscan-compatible APIs across multiple EVM chains.
 */
export class EtherscanProvider extends BaseProvider implements TransactionProvider {
  public readonly name = 'etherscan';
  public readonly supportedChains: readonly Chain[] = EVM_CHAINS;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super(2, 300);
    this.apiKey = apiKey;
  }

  async fetchTransactions(address: string, chain: Chain): Promise<RawTransaction[]> {
    const baseUrl = CHAIN_API_URLS[chain];
    if (!baseUrl) throw new ProviderError(this.name, `Unsupported chain: ${chain}`);

    logger.info(`Fetching ${chain} transactions for ${address}`);

    const [normalTxs, erc20Txs, internalTxs] = await Promise.all([
      this.fetchTxList(baseUrl, address, 'txlist'),
      this.fetchTxList(baseUrl, address, 'tokentx'),
      this.fetchTxList(baseUrl, address, 'txlistinternal'),
    ]);

    const allTxs = [...normalTxs, ...erc20Txs, ...internalTxs];

    // Deduplicate by hash
    const seen = new Set<string>();
    const unique: RawTransaction[] = [];
    for (const tx of allTxs) {
      const key = `${tx.hash}-${tx.tokenSymbol}-${tx.amount}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(tx);
      }
    }

    return unique.sort((a, b) => a.timestamp - b.timestamp);
  }

  private async fetchTxList(
    baseUrl: string,
    address: string,
    action: string,
  ): Promise<RawTransaction[]> {
    return this.schedule(async () => {
      const url = appendParams(baseUrl, {
        module: 'account',
        action,
        address,
        startblock: 0,
        endblock: 99999999,
        sort: 'asc',
        apikey: this.apiKey,
      });

      const res = await fetch(url);
      if (!res.ok) throw new ProviderError(this.name, `HTTP ${res.status}: ${res.statusText}`);

      const json = (await res.json()) as { status: string; result: EtherscanTx[] | string };
      if (json.status !== '1' || !Array.isArray(json.result)) return [];

      const chainName = this.getChainFromUrl(baseUrl);
      return json.result.map((tx) => this.mapTx(tx, chainName));
    });
  }

  private mapTx(tx: EtherscanTx, chain: Chain): RawTransaction {
    const decimals = parseInt(tx.tokenDecimal || '18', 10);
    const rawAmount = parseFloat(tx.value || '0');
    const amount = decimals > 0 ? rawAmount / 10 ** decimals : rawAmount;

    const gasUsed = parseFloat(tx.gasUsed || '0');
    const gasPrice = parseFloat(tx.gasPrice || '0');
    const feeNative = (gasUsed * gasPrice) / 1e18;

    return {
      hash: tx.hash,
      chain,
      from: tx.from,
      to: tx.to || '',
      tokenAddress: tx.contractAddress || null,
      tokenSymbol: tx.tokenSymbol || this.getNativeSymbol(chain),
      amount,
      feeNative,
      timestamp: parseInt(tx.timeStamp, 10),
      blockNumber: parseInt(tx.blockNumber, 10),
      methodId: tx.methodId,
      functionName: tx.functionName,
    };
  }

  private getNativeSymbol(chain: Chain): string {
    const symbols: Partial<Record<Chain, string>> = {
      ethereum: 'ETH',
      bsc: 'BNB',
      polygon: 'MATIC',
      arbitrum: 'ETH',
      base: 'ETH',
      avalanche: 'AVAX',
    };
    return symbols[chain] ?? 'ETH';
  }

  private getChainFromUrl(url: string): Chain {
    for (const [chain, apiUrl] of Object.entries(CHAIN_API_URLS)) {
      if (url === apiUrl) return chain as Chain;
    }
    return 'ethereum';
  }
}

export { CHAIN_API_URLS, EVM_CHAINS };
