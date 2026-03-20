// ---------------------------------------------------------------------------
// base.ts -- Abstract base class for all fetchers
// ---------------------------------------------------------------------------

import type { Fetcher, FetchResult, Monitor, Competitor, MonitorType } from '../types/index.js';
import { getRateLimiter } from './rate-limiter.js';
import { withRetry } from '../utils/index.js';

export abstract class BaseFetcher implements Fetcher {
  abstract readonly monitorType: MonitorType;
  abstract readonly name: string;

  abstract isConfigured(): boolean;
  protected abstract doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult>;

  async fetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    const limiter = getRateLimiter(this.monitorType);
    return limiter.schedule(async () => {
      return await withRetry(() => this.doFetch(monitor, competitor), { maxAttempts: 2 });
    });
  }
}
