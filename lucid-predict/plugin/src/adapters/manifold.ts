// ---------------------------------------------------------------------------
// adapters/manifold.ts -- Manifold Markets v0 API adapter
// ---------------------------------------------------------------------------

import Bottleneck from 'bottleneck';
import type { Market, PlatformId, MarketCategory } from '../types/index.js';
import type { IPlatformAdapter } from './types.js';
import { log } from '../utils/logger.js';

const DEFAULT_API_URL = 'https://api.manifold.markets/v0';

export class ManifoldAdapter implements IPlatformAdapter {
  readonly platformId: PlatformId = 'manifold';
  private readonly baseUrl: string;
  private readonly limiter: Bottleneck;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? DEFAULT_API_URL;
    this.limiter = new Bottleneck({ maxConcurrent: 3, minTime: 200 });
  }

  async searchMarkets(query: string, limit: number = 20): Promise<Market[]> {
    const params = new URLSearchParams({ term: query, limit: String(limit) });
    const data = await this.fetch<any[]>(`/search-markets?${params}`);
    return data.map((m) => this.normalize(m));
  }

  async getMarket(externalId: string): Promise<Market> {
    const data = await this.fetch<any>(`/market/${externalId}`);
    return this.normalize(data);
  }

  async getTrending(limit: number = 10): Promise<Market[]> {
    const params = new URLSearchParams({ limit: String(limit), sort: 'most-popular' });
    const data = await this.fetch<any[]>(`/search-markets?${params}`);
    return data.map((m) => this.normalize(m));
  }

  async getMarketPrices(externalId: string): Promise<{ yes: number; no: number }> {
    const m = await this.getMarket(externalId);
    return m.currentPrices;
  }

  private normalize(raw: any): Market {
    const prob = Number(raw.probability ?? 0.5);
    return {
      platform: 'manifold',
      externalId: String(raw.id ?? ''),
      title: raw.question ?? '',
      description: raw.textDescription ?? raw.description ?? '',
      category: this.mapCategory(raw.groupSlugs),
      resolutionType: raw.outcomeType === 'BINARY' ? 'binary' : raw.outcomeType === 'MULTIPLE_CHOICE' ? 'multiple_choice' : 'binary',
      outcomes: [
        { label: 'Yes', price: prob },
        { label: 'No', price: 1 - prob },
      ],
      currentPrices: { yes: prob, no: 1 - prob },
      volumeUsd: Number(raw.volume ?? raw.volume24Hours ?? 0),
      liquidityUsd: Number(raw.totalLiquidity ?? 0),
      closeDate: raw.closeTime ? new Date(raw.closeTime).toISOString() : '',
      status: raw.isResolved ? 'resolved' : raw.closeTime && Date.now() > raw.closeTime ? 'closed' : 'open',
      url: raw.url ?? `https://manifold.markets/${raw.creatorUsername}/${raw.slug ?? raw.id}`,
    };
  }

  private mapCategory(groupSlugs: any): MarketCategory {
    const slugs = Array.isArray(groupSlugs) ? groupSlugs.join(' ') : '';
    if (slugs.includes('politic')) return 'politics';
    if (slugs.includes('crypto') || slugs.includes('bitcoin')) return 'crypto';
    if (slugs.includes('sport')) return 'sports';
    if (slugs.includes('tech')) return 'technology';
    if (slugs.includes('econ')) return 'economics';
    return 'other';
  }

  private async fetch<T>(path: string): Promise<T> {
    return this.limiter.schedule(async () => {
      const url = `${this.baseUrl}${path}`;
      log.debug('manifold fetch', { url });
      const res = await globalThis.fetch(url);
      if (!res.ok) throw new Error(`Manifold API error: ${res.status} ${res.statusText}`);
      return res.json() as Promise<T>;
    });
  }
}
