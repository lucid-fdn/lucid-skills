// ---------------------------------------------------------------------------
// twitter.ts -- Twitter/X Social Monitor fetcher
// ---------------------------------------------------------------------------

import { TwitterApi } from 'twitter-api-v2';
import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';
import { truncate } from '../utils/index.js';

export class TwitterFetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'twitter';
  readonly name = 'Twitter/X Monitor';
  private client?: TwitterApi;

  constructor(bearerToken?: string) {
    super();
    if (bearerToken) {
      this.client = new TwitterApi(bearerToken);
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    if (!this.client) return { signals: [] };

    const query = (monitor.config?.query as string) ?? competitor.name;
    const sinceId = monitor.config?.sinceId as string | undefined;

    const result = await this.client.v2.search(query, {
      max_results: 20,
      ...(sinceId ? { since_id: sinceId } : {}),
      'tweet.fields': ['created_at', 'author_id', 'public_metrics'],
    });

    const signals: SignalInsert[] = [];
    let newestId: string | undefined;

    for (const tweet of result.data?.data ?? []) {
      if (!newestId) newestId = tweet.id;
      signals.push({
        tenant_id: monitor.tenant_id,
        competitor_id: monitor.competitor_id,
        monitor_id: monitor.id,
        signal_type: 'social_mention',
        severity: 'low',
        title: `${competitor.name} mentioned on X`,
        summary: truncate(tweet.text, 500),
        url: `https://x.com/i/status/${tweet.id}`,
        metadata: { tweetId: tweet.id, metrics: tweet.public_metrics },
      });
    }

    return { signals, metadata: { newestId } };
  }
}
