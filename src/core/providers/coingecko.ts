import { BaseProvider } from './base.js';
import type { PricePoint, PriceProvider } from '../types/index.js';
import { ProviderError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

/** Map common token symbols to CoinGecko IDs */
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  USDT: 'tether',
  USDC: 'usd-coin',
  DAI: 'dai',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  ARB: 'arbitrum',
  OP: 'optimism',
};

/**
 * Fetches historical price data from CoinGecko.
 */
export class CoinGeckoProvider extends BaseProvider implements PriceProvider {
  public readonly name = 'coingecko';
  private readonly apiKey?: string;

  constructor(apiKey?: string) {
    super(1, 1500); // CoinGecko free tier: ~30 req/min
    this.apiKey = apiKey;
  }

  async fetchPrice(tokenSymbol: string, date: string): Promise<PricePoint | null> {
    const coinId = this.resolveCoinId(tokenSymbol);
    if (!coinId) {
      logger.warn(`Unknown CoinGecko ID for symbol: ${tokenSymbol}`);
      return null;
    }

    // CoinGecko expects dd-mm-yyyy
    const parts = date.split('-');
    const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

    return this.schedule(async () => {
      const url = `${COINGECKO_API}/coins/${coinId}/history?date=${formattedDate}&localization=false`;
      const headers: Record<string, string> = {};
      if (this.apiKey) headers['x-cg-demo-api-key'] = this.apiKey;

      const res = await fetch(url, { headers });
      if (!res.ok) {
        if (res.status === 429) throw new ProviderError(this.name, 'Rate limited');
        return null;
      }

      const json = (await res.json()) as {
        market_data?: { current_price?: { usd?: number } };
      };
      const price = json.market_data?.current_price?.usd;
      if (price === undefined) return null;

      return {
        tokenSymbol: tokenSymbol.toUpperCase(),
        date,
        priceUsd: price,
        source: this.name,
      };
    });
  }

  async fetchPriceRange(
    tokenSymbol: string,
    startDate: string,
    endDate: string,
  ): Promise<PricePoint[]> {
    const coinId = this.resolveCoinId(tokenSymbol);
    if (!coinId) return [];

    const from = Math.floor(new Date(startDate).getTime() / 1000);
    const to = Math.floor(new Date(endDate).getTime() / 1000);

    return this.schedule(async () => {
      const url = `${COINGECKO_API}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;
      const headers: Record<string, string> = {};
      if (this.apiKey) headers['x-cg-demo-api-key'] = this.apiKey;

      const res = await fetch(url, { headers });
      if (!res.ok) return [];

      const json = (await res.json()) as { prices?: [number, number][] };
      if (!json.prices) return [];

      return json.prices.map(([timestamp, price]): PricePoint => {
        const d = new Date(timestamp);
        return {
          tokenSymbol: tokenSymbol.toUpperCase(),
          date: d.toISOString().slice(0, 10),
          priceUsd: price,
          source: this.name,
        };
      });
    });
  }

  private resolveCoinId(symbol: string): string | undefined {
    return SYMBOL_TO_ID[symbol.toUpperCase()];
  }
}

export { SYMBOL_TO_ID };
