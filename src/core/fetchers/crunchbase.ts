// ---------------------------------------------------------------------------
// crunchbase.ts -- Crunchbase Funding Monitor fetcher
// ---------------------------------------------------------------------------

import RssParser from 'rss-parser';
import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';
import { truncate } from '../utils/index.js';

export class CrunchbaseFetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'crunchbase';
  readonly name = 'Crunchbase Funding Monitor';
  private parser = new RssParser();

  isConfigured(): boolean {
    return true;
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    const feedUrl = monitor.url || 'https://news.crunchbase.com/feed/';
    const feed = await this.parser.parseURL(feedUrl);
    const signals: SignalInsert[] = [];
    const lastFetched = monitor.last_fetched_at ? new Date(monitor.last_fetched_at) : new Date(0);
    const searchTerm = competitor.name.toLowerCase();

    for (const item of feed.items ?? []) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const title = (item.title ?? '').toLowerCase();
      const content = (item.contentSnippet ?? '').toLowerCase();

      if (pubDate > lastFetched && (title.includes(searchTerm) || content.includes(searchTerm))) {
        const isFunding = /funding|raised|series [a-z]|seed|investment/i.test(item.title ?? '');
        signals.push({
          tenant_id: monitor.tenant_id,
          competitor_id: monitor.competitor_id,
          monitor_id: monitor.id,
          signal_type: isFunding ? 'funding_round' : 'news',
          severity: isFunding ? 'high' : 'medium',
          title: `${competitor.name}: ${item.title ?? 'Crunchbase news'}`,
          summary: truncate(item.contentSnippet ?? '', 500),
          url: item.link,
          metadata: { source: 'crunchbase' },
        });
      }
    }

    return { signals };
  }
}
