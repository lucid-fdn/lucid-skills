// ---------------------------------------------------------------------------
// index.ts -- Fetcher registry: creates and returns all configured fetchers
// ---------------------------------------------------------------------------

import type { PluginConfig, Fetcher, MonitorType } from '../types/index.js';
import { WebDiffFetcher } from './web-diff.js';
import { GitHubFetcher } from './github.js';
import { RssFetcher } from './rss.js';
import { NpmFetcher } from './npm.js';
import { JobsFetcher } from './jobs.js';
import { TwitterFetcher } from './twitter.js';
import { RedditFetcher } from './reddit.js';
import { HackerNewsFetcher } from './hackernews.js';
import { ProductHuntFetcher } from './producthunt.js';
import { LinkedInFetcher } from './linkedin.js';
import { G2Fetcher } from './g2.js';
import { CrunchbaseFetcher } from './crunchbase.js';

export function createFetcherRegistry(config: PluginConfig): Map<MonitorType, Fetcher> {
  const registry = new Map<MonitorType, Fetcher>();

  const fetchers: Fetcher[] = [
    new WebDiffFetcher(),
    new GitHubFetcher(config.githubToken),
    new RssFetcher(),
    new NpmFetcher(),
    new JobsFetcher(),
    new TwitterFetcher(config.twitterBearerToken),
    new RedditFetcher(),
    new HackerNewsFetcher(),
    new ProductHuntFetcher(),
    new LinkedInFetcher(),
    new G2Fetcher(),
    new CrunchbaseFetcher(),
  ];

  for (const fetcher of fetchers) {
    if (fetcher.isConfigured()) {
      registry.set(fetcher.monitorType, fetcher);
    }
  }

  return registry;
}

// Re-export all fetcher classes
export { WebDiffFetcher } from './web-diff.js';
export { GitHubFetcher } from './github.js';
export { RssFetcher } from './rss.js';
export { NpmFetcher } from './npm.js';
export { JobsFetcher } from './jobs.js';
export { TwitterFetcher } from './twitter.js';
export { RedditFetcher } from './reddit.js';
export { HackerNewsFetcher } from './hackernews.js';
export { ProductHuntFetcher } from './producthunt.js';
export { LinkedInFetcher } from './linkedin.js';
export { G2Fetcher } from './g2.js';
export { CrunchbaseFetcher } from './crunchbase.js';
export { BaseFetcher } from './base.js';
export { getRateLimiter, resetRateLimiters } from './rate-limiter.js';
