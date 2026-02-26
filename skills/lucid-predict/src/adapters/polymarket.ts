// ---------------------------------------------------------------------------
// adapters/polymarket.ts -- Polymarket Gamma API adapter
// ---------------------------------------------------------------------------

import Bottleneck from 'bottleneck';
import type { Market, PlatformId, MarketCategory } from '../types/index.js';
import type { IPlatformAdapter } from './types.js';
import { log } from '../utils/logger.js';

const DEFAULT_API_URL = 'https://gamma-api.polymarket.com';

export class PolymarketAdapter implements IPlatformAdapter {
  readonly platformId: PlatformId = 'polymarket';
  private readonly baseUrl: string;
  private readonly limiter: Bottleneck;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? DEFAULT_API_URL;
    this.limiter = new Bottleneck({ maxConcurrent: 3, minTime: 300 });
  }

  async searchMarkets(query: string, limit: number = 20): Promise<Market[]> {
    const params = new URLSearchParams({ _q: query, _limit: String(limit), active: 'true' });
    const data = await this.fetch<any[]>(`/markets?${params}`);
    return data.map((m) => this.normalize(m));
  }

  async getMarket(externalId: string): Promise<Market> {
    const data = await this.fetch<any>(`/markets/${externalId}`);
    return this.normalize(data);
  }

  async getTrending(limit: number = 10): Promise<Market[]> {
    const params = new URLSearchParams({ _limit: String(limit), active: 'true', order: 'volume24hr', ascending: 'false' });
    const data = await this.fetch<any[]>(`/markets?${params}`);
    return data.map((m) => this.normalize(m));
  }

  async getMarketPrices(externalId: string): Promise<{ yes: number; no: number }> {
    const m = await this.getMarket(externalId);
    return m.currentPrices;
  }

  private normalize(raw: any): Market {
    const prices = this.parsePrices(raw.outcomePrices);
    return {
      platform: 'polymarket',
      externalId: String(raw.id ?? raw.condition_id ?? ''),
      title: raw.question ?? raw.title ?? '',
      description: raw.description ?? '',
      category: this.mapCategory(raw.category ?? raw.tags),
      resolutionType: 'binary',
      outcomes: [
        { label: 'Yes', price: prices.yes },
        { label: 'No', price: prices.no },
      ],
      currentPrices: prices,
      volumeUsd: Number(raw.volume ?? raw.volume24hr ?? 0),
      liquidityUsd: Number(raw.liquidity ?? 0),
      closeDate: raw.endDate ?? raw.end_date_iso ?? '',
      status: raw.active ? 'open' : raw.resolved ? 'resolved' : 'closed',
      url: `https://polymarket.com/event/${raw.slug ?? raw.id ?? ''}`,
    };
  }

  private parsePrices(outcomePrices: any): { yes: number; no: number } {
    if (typeof outcomePrices === 'string') {
      try {
        const parsed = JSON.parse(outcomePrices);
        return { yes: Number(parsed[0] ?? 0.5), no: Number(parsed[1] ?? 0.5) };
      } catch {
        return { yes: 0.5, no: 0.5 };
      }
    }
    if (Array.isArray(outcomePrices)) {
      return { yes: Number(outcomePrices[0] ?? 0.5), no: Number(outcomePrices[1] ?? 0.5) };
    }
    return { yes: 0.5, no: 0.5 };
  }

  private mapCategory(raw: any): MarketCategory {
    const s = String(raw ?? '').toLowerCase();
    if (s.includes('politic')) return 'politics';
    if (s.includes('crypto') || s.includes('bitcoin')) return 'crypto';
    if (s.includes('sport')) return 'sports';
    if (s.includes('tech')) return 'technology';
    if (s.includes('econ')) return 'economics';
    if (s.includes('science')) return 'science';
    return 'other';
  }

  private async fetch<T>(path: string): Promise<T> {
    return this.limiter.schedule(async () => {
      const url = `${this.baseUrl}${path}`;
      log.debug('polymarket fetch', { url });
      const res = await globalThis.fetch(url);
      if (!res.ok) throw new Error(`Polymarket API error: ${res.status} ${res.statusText}`);
      return res.json() as Promise<T>;
    });
  }
}
