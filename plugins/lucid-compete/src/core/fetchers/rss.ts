// ---------------------------------------------------------------------------
// rss.ts -- RSS/Atom Feed Monitor fetcher
// ---------------------------------------------------------------------------

import RssParser from 'rss-parser';
import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';
import { truncate, stripHtml } from '../utils/index.js';

export class RssFetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'rss';
  readonly name = 'RSS/Atom Feed Monitor';
  private parser = new RssParser();

  isConfigured(): boolean {
    return true;
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    const feed = await this.parser.parseURL(monitor.url);
    const signals: SignalInsert[] = [];
    const lastFetched = monitor.last_fetched_at
      ? new Date(monitor.last_fetched_at)
      : new Date(0);

    for (const item of feed.items ?? []) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      if (pubDate > lastFetched) {
        signals.push({
          tenant_id: monitor.tenant_id,
          competitor_id: monitor.competitor_id,
          monitor_id: monitor.id,
          signal_type: 'news',
          severity: 'medium',
          title: `${competitor.name}: ${item.title ?? 'New post'}`,
          summary: truncate(stripHtml(item.contentSnippet ?? item.content ?? ''), 500),
          url: item.link,
          metadata: { feedTitle: feed.title, author: item.creator },
        });
      }
    }

    return { signals };
  }
}
