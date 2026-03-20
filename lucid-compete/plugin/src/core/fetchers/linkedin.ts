// ---------------------------------------------------------------------------
// linkedin.ts -- LinkedIn Company Monitor fetcher (via RSSHub proxy)
// ---------------------------------------------------------------------------

import RssParser from 'rss-parser';
import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';
import { truncate, stripHtml } from '../utils/index.js';

export class LinkedInFetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'linkedin';
  readonly name = 'LinkedIn Company Monitor';
  private parser = new RssParser();

  isConfigured(): boolean {
    return true; // Uses public RSSHub proxy
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    // monitor.url is the RSSHub LinkedIn URL like "https://rsshub.app/linkedin/company/{id}"
    const feed = await this.parser.parseURL(monitor.url);
    const signals: SignalInsert[] = [];
    const lastFetched = monitor.last_fetched_at ? new Date(monitor.last_fetched_at) : new Date(0);

    for (const item of feed.items ?? []) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      if (pubDate > lastFetched) {
        signals.push({
          tenant_id: monitor.tenant_id,
          competitor_id: monitor.competitor_id,
          monitor_id: monitor.id,
          signal_type: 'social_mention',
          severity: 'low',
          title: `${competitor.name} posted on LinkedIn`,
          summary: truncate(stripHtml(item.content ?? item.contentSnippet ?? ''), 500),
          url: item.link,
          metadata: {},
        });
      }
    }

    return { signals };
  }
}
