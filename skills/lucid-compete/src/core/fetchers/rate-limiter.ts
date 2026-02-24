// ---------------------------------------------------------------------------
// rate-limiter.ts -- Per-source rate limiting using Bottleneck
// ---------------------------------------------------------------------------

import Bottleneck from 'bottleneck';
import type { MonitorType } from '../types/index.js';

const limiters = new Map<string, Bottleneck>();

const DEFAULT_OPTIONS: Bottleneck.ConstructorOptions = {
  maxConcurrent: 2,
  minTime: 1000, // 1 second between requests
};

const SOURCE_OPTIONS: Partial<Record<MonitorType, Bottleneck.ConstructorOptions>> = {
  twitter: { maxConcurrent: 1, minTime: 2000 },
  reddit: { maxConcurrent: 1, minTime: 2000 },
  github: { maxConcurrent: 3, minTime: 500 },
  g2: { maxConcurrent: 1, minTime: 3000 },
};

export function getRateLimiter(source: MonitorType): Bottleneck {
  let limiter = limiters.get(source);
  if (!limiter) {
    const opts = SOURCE_OPTIONS[source] ?? DEFAULT_OPTIONS;
    limiter = new Bottleneck(opts);
    limiters.set(source, limiter);
  }
  return limiter;
}

export function resetRateLimiters(): void {
  limiters.clear();
}
