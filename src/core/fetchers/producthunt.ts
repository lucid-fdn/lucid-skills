// ---------------------------------------------------------------------------
// producthunt.ts -- Product Hunt Monitor fetcher
// ---------------------------------------------------------------------------

import RssParser from 'rss-parser';
import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';
import { truncate } from '../utils/index.js';

export class ProductHuntFetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'producthunt';
  readonly name = 'Product Hunt Monitor';
  private parser = new RssParser();

  isConfigured(): boolean {
    return true;
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    const feedUrl = monitor.url || 'https://www.producthunt.com/feed';
    const feed = await this.parser.parseURL(feedUrl);
    const signals: SignalInsert[] = [];
    const lastFetched = monitor.last_fetched_at ? new Date(monitor.last_fetched_at) : new Date(0);
    const searchTerm = competitor.name.toLowerCase();

    for (const item of feed.items ?? []) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const matchesCompetitor =
        (item.title ?? '').toLowerCase().includes(searchTerm) ||
        (item.contentSnippet ?? '').toLowerCase().includes(searchTerm);

      if (pubDate > lastFetched && matchesCompetitor) {
        signals.push({
          tenant_id: monitor.tenant_id,
          competitor_id: monitor.competitor_id,
          monitor_id: monitor.id,
          signal_type: 'feature_launch',
          severity: 'high',
          title: `${competitor.name} launched on Product Hunt: ${item.title}`,
          summary: truncate(item.contentSnippet ?? '', 500),
          url: item.link,
          metadata: {},
        });
      }
    }

    return { signals };
  }
}
