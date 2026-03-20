// ---------------------------------------------------------------------------
// adapters/kalshi.ts -- Kalshi v2 API adapter
// ---------------------------------------------------------------------------

import Bottleneck from 'bottleneck';
import type { Market, PlatformId, MarketCategory } from '../types/index.js';
import type { IPlatformAdapter } from './types.js';
import { log } from '../utils/logger.js';

const DEFAULT_API_URL = 'https://api.elections.kalshi.com/trade-api/v2';

export class KalshiAdapter implements IPlatformAdapter {
  readonly platformId: PlatformId = 'kalshi';
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly limiter: Bottleneck;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl ?? DEFAULT_API_URL;
    this.apiKey = apiKey;
    this.limiter = new Bottleneck({ maxConcurrent: 3, minTime: 500 });
  }

  async searchMarkets(query: string, limit: number = 20): Promise<Market[]> {
    if (!this.apiKey) return [];
    const params = new URLSearchParams({ status: 'open', limit: String(limit) });
    const data = await this.fetch<any>(`/markets?${params}`);
    const markets = data?.markets ?? [];
    return markets.filter((m: any) =>
      (m.title ?? '').toLowerCase().includes(query.toLowerCase())
    ).map((m: any) => this.normalize(m));
  }

  async getMarket(externalId: string): Promise<Market> {
    if (!this.apiKey) throw new Error('Kalshi API key required');
    const data = await this.fetch<any>(`/markets/${externalId}`);
    return this.normalize(data.market ?? data);
  }

  async getTrending(limit: number = 10): Promise<Market[]> {
    if (!this.apiKey) return [];
    const params = new URLSearchParams({ status: 'open', limit: String(limit) });
    const data = await this.fetch<any>(`/markets?${params}`);
    return (data?.markets ?? []).map((m: any) => this.normalize(m));
  }

  async getMarketPrices(externalId: string): Promise<{ yes: number; no: number }> {
    const m = await this.getMarket(externalId);
    return m.currentPrices;
  }

  private normalize(raw: any): Market {
    const yesPrice = Number(raw.yes_bid ?? raw.last_price ?? 0.5) / 100;
    const noPrice = 1 - yesPrice;
    return {
      platform: 'kalshi',
      externalId: String(raw.ticker ?? raw.id ?? ''),
      title: raw.title ?? raw.subtitle ?? '',
      description: raw.rules_primary ?? raw.description ?? '',
      category: this.mapCategory(raw.category),
      resolutionType: 'binary',
      outcomes: [
        { label: 'Yes', price: yesPrice },
        { label: 'No', price: noPrice },
      ],
      currentPrices: { yes: yesPrice, no: noPrice },
      volumeUsd: Number(raw.volume ?? 0),
      liquidityUsd: Number(raw.open_interest ?? 0),
      closeDate: raw.close_time ?? raw.expiration_time ?? '',
      status: raw.status === 'open' ? 'open' : raw.status === 'settled' ? 'resolved' : 'closed',
      url: `https://kalshi.com/markets/${raw.ticker ?? raw.id ?? ''}`,
    };
  }

  private mapCategory(raw: any): MarketCategory {
    const s = String(raw ?? '').toLowerCase();
    if (s.includes('politic')) return 'politics';
    if (s.includes('crypto')) return 'crypto';
    if (s.includes('econ') || s.includes('financ')) return 'economics';
    if (s.includes('tech')) return 'technology';
    if (s.includes('climate') || s.includes('science')) return 'science';
    return 'other';
  }

  private async fetch<T>(path: string): Promise<T> {
    return this.limiter.schedule(async () => {
      const url = `${this.baseUrl}${path}`;
      log.debug('kalshi fetch', { url });
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
      const res = await globalThis.fetch(url, { headers });
      if (!res.ok) throw new Error(`Kalshi API error: ${res.status} ${res.statusText}`);
      return res.json() as Promise<T>;
    });
  }
}
