// ---------------------------------------------------------------------------
// reddit.ts -- Reddit Social Monitor fetcher
// ---------------------------------------------------------------------------

import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';
import { truncate } from '../utils/index.js';

interface RedditPost {
  title: string;
  selftext: string;
  permalink: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

interface RedditListingChild {
  data: RedditPost;
}

interface RedditListingResponse {
  data?: {
    children?: RedditListingChild[];
  };
}

export class RedditFetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'reddit';
  readonly name = 'Reddit Monitor';

  isConfigured(): boolean {
    return true;
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    const query = (monitor.config?.query as string) ?? competitor.name;
    const subreddit = monitor.config?.subreddit as string | undefined;

    const url = subreddit
      ? `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=new&restrict_sr=on&limit=25`
      : `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=25`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'compete-bot/1.0' },
    });
    if (!res.ok) throw new Error(`Reddit API returned ${res.status}`);

    const data = (await res.json()) as RedditListingResponse;
    const signals: SignalInsert[] = [];
    const lastFetched = monitor.last_fetched_at ? new Date(monitor.last_fetched_at).getTime() / 1000 : 0;

    for (const child of data?.data?.children ?? []) {
      const post = child.data;
      if (post.created_utc > lastFetched) {
        signals.push({
          tenant_id: monitor.tenant_id,
          competitor_id: monitor.competitor_id,
          monitor_id: monitor.id,
          signal_type: 'social_mention',
          severity: 'low',
          title: `${competitor.name} on Reddit: ${truncate(post.title, 200)}`,
          summary: truncate(post.selftext ?? '', 500),
          url: `https://reddit.com${post.permalink}`,
          metadata: { subreddit: post.subreddit, score: post.score, numComments: post.num_comments },
        });
      }
    }

    return { signals };
  }
}
