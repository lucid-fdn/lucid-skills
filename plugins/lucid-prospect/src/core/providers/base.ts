import Bottleneck from 'bottleneck';
import { logger } from '../utils/logger.js';
import { FetchError } from '../utils/errors.js';
import { withRetry } from '../utils/retry.js';

export interface RateLimitOptions {
  maxConcurrent?: number;
  minTime?: number;
  reservoir?: number;
  reservoirRefreshInterval?: number;
  reservoirRefreshAmount?: number;
}

export abstract class BaseProvider {
  protected limiter: Bottleneck;
  abstract readonly name: string;

  constructor(opts: RateLimitOptions = {}) {
    this.limiter = new Bottleneck({
      maxConcurrent: opts.maxConcurrent ?? 2,
      minTime: opts.minTime ?? 500,
      reservoir: opts.reservoir,
      reservoirRefreshInterval: opts.reservoirRefreshInterval,
      reservoirRefreshAmount: opts.reservoirRefreshAmount,
    });
  }

  abstract isConfigured(): boolean;

  protected async fetchJson<T>(
    url: string,
    init?: RequestInit,
    retries = 2,
  ): Promise<T> {
    return this.limiter.schedule(() =>
      withRetry(
        async () => {
          logger.debug(`[${this.name}] Fetching: ${url}`);
          const res = await fetch(url, {
            ...init,
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              ...init?.headers,
            },
          });

          if (!res.ok) {
            const body = await res.text().catch(() => 'No body');
            throw new FetchError(
              `[${this.name}] HTTP ${res.status}: ${body}`,
              res.status,
              url,
            );
          }

          return (await res.json()) as T;
        },
        { maxRetries: retries },
      ),
    );
  }
}
