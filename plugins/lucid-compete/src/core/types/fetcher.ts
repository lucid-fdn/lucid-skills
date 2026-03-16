// ---------------------------------------------------------------------------
// fetcher.ts -- Fetcher abstraction for monitor sources
// ---------------------------------------------------------------------------

import type { Monitor, Competitor, SignalInsert } from './database.js';
import type { MonitorType } from './common.js';

/** The result returned by a Fetcher after polling a source. */
export interface FetchResult {
  /** Zero or more signals detected during this fetch cycle. */
  signals: SignalInsert[];
  /** Optional implementation-specific metadata (e.g. rate-limit info). */
  metadata?: Record<string, unknown>;
}

/** Contract that every monitor-source fetcher must implement. */
export interface Fetcher {
  /** The monitor type this fetcher handles. */
  readonly monitorType: MonitorType;
  /** Human-readable name for logging / UI. */
  readonly name: string;
  /** Returns true when all required credentials / dependencies are available. */
  isConfigured(): boolean;
  /** Fetch the latest data for the given monitor and return any new signals. */
  fetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult>;
}
