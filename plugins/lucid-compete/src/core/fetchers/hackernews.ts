// ---------------------------------------------------------------------------
// hackernews.ts -- Hacker News Monitor fetcher
// ---------------------------------------------------------------------------

import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';
import { truncate } from '../utils/index.js';

interface HNHit {
  objectID: string;
  title?: string;
  story_text?: string;
  comment_text?: string;
  story_id?: number;
  points?: number;
  num_comments?: number;
  created_at: string;
}

interface HNSearchResponse {
  hits?: HNHit[];
}

export class HackerNewsFetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'hackernews';
  readonly name = 'Hacker News Monitor';

  isConfigured(): boolean {
    return true;
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    const query = (monitor.config?.query as string) ?? competitor.name;
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=(story,comment)&hitsPerPage=20`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HN API returned ${res.status}`);

    const data = (await res.json()) as HNSearchResponse;
    const signals: SignalInsert[] = [];
    const lastFetched = monitor.last_fetched_at ? new Date(monitor.last_fetched_at) : new Date(0);

    for (const hit of data?.hits ?? []) {
      const createdAt = new Date(hit.created_at);
      if (createdAt > lastFetched) {
        const isStory = !!hit.title;
        signals.push({
          tenant_id: monitor.tenant_id,
          competitor_id: monitor.competitor_id,
          monitor_id: monitor.id,
          signal_type: 'social_mention',
          severity: 'low',
          title: isStory
            ? `${competitor.name} on HN: ${hit.title}`
            : `${competitor.name} mentioned in HN comment`,
          summary: truncate(hit.story_text ?? hit.comment_text ?? hit.title ?? '', 500),
          url: isStory
            ? `https://news.ycombinator.com/item?id=${hit.objectID}`
            : `https://news.ycombinator.com/item?id=${hit.story_id}`,
          metadata: { points: hit.points, numComments: hit.num_comments, hnId: hit.objectID },
        });
      }
    }

    return { signals };
  }
}
