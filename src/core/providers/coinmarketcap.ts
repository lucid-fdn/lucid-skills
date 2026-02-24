import { BaseProvider } from './base.js';
import type { PricePoint, PriceProvider } from '../types/index.js';
import { ProviderError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const CMC_API = 'https://pro-api.coinmarketcap.com/v2';

/**
 * Fetches historical price data from CoinMarketCap (backup provider).
 */
export class CoinMarketCapProvider extends BaseProvider implements PriceProvider {
  public readonly name = 'coinmarketcap';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super(1, 1000);
    this.apiKey = apiKey;
  }

  async fetchPrice(tokenSymbol: string, date: string): Promise<PricePoint | null> {
    return this.schedule(async () => {
      const isoDate = `${date}T00:00:00.000Z`;
      const url = `${CMC_API}/cryptocurrency/quotes/historical?symbol=${tokenSymbol.toUpperCase()}&time_start=${isoDate}&time_end=${isoDate}&count=1&convert=USD`;

      const res = await fetch(url, {
        headers: { 'X-CMC_PRO_API_KEY': this.apiKey },
      });

      if (!res.ok) {
        if (res.status === 429) throw new ProviderError(this.name, 'Rate limited');
        logger.warn(`CMC price fetch failed for ${tokenSymbol} on ${date}: ${res.status}`);
        return null;
      }

      const json = (await res.json()) as {
        data?: Record<
          string,
          { quotes?: { timestamp: string; quote: { USD: { price: number } } }[] }[]
        >;
      };

      const entries = json.data?.[tokenSymbol.toUpperCase()];
      const firstEntry = entries?.[0];
      const quote = firstEntry?.quotes?.[0];
      if (!quote) return null;

      return {
        tokenSymbol: tokenSymbol.toUpperCase(),
        date,
        priceUsd: quote.quote.USD.price,
        source: this.name,
      };
    });
  }

  async fetchPriceRange(
    tokenSymbol: string,
    startDate: string,
    endDate: string,
  ): Promise<PricePoint[]> {
    return this.schedule(async () => {
      const url = `${CMC_API}/cryptocurrency/quotes/historical?symbol=${tokenSymbol.toUpperCase()}&time_start=${startDate}T00:00:00.000Z&time_end=${endDate}T23:59:59.000Z&interval=daily&convert=USD`;

      const res = await fetch(url, {
        headers: { 'X-CMC_PRO_API_KEY': this.apiKey },
      });

      if (!res.ok) return [];

      const json = (await res.json()) as {
        data?: Record<
          string,
          { quotes?: { timestamp: string; quote: { USD: { price: number } } }[] }[]
        >;
      };

      const entries = json.data?.[tokenSymbol.toUpperCase()];
      const firstEntry = entries?.[0];
      if (!firstEntry?.quotes) return [];

      return firstEntry.quotes.map((q): PricePoint => {
        return {
          tokenSymbol: tokenSymbol.toUpperCase(),
          date: new Date(q.timestamp).toISOString().slice(0, 10),
          priceUsd: q.quote.USD.price,
          source: this.name,
        };
      });
    });
  }
}
