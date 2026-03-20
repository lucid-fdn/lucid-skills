// ---------------------------------------------------------------------------
// web-diff.ts -- Web Page Change Detection fetcher
// ---------------------------------------------------------------------------

import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';
import { contentHash, stripHtml, truncate } from '../utils/index.js';

export class WebDiffFetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'web-diff';
  readonly name = 'Web Page Change Detection';

  isConfigured(): boolean {
    return true; // Always available — uses native fetch
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    const response = await fetch(monitor.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${monitor.url}`);
    }

    const html = await response.text();
    const textContent = stripHtml(html).trim();
    const newHash = contentHash(textContent);

    // No change
    if (monitor.last_content_hash && newHash === monitor.last_content_hash) {
      return { signals: [], metadata: { hash: newHash, changed: false } };
    }

    // First fetch (no previous hash) — store hash but don't create signal
    if (!monitor.last_content_hash) {
      return { signals: [], metadata: { hash: newHash, changed: false, firstFetch: true } };
    }

    // Changed! Create signal
    const isPricingPage = monitor.url.toLowerCase().includes('pricing');
    const signalType = isPricingPage ? 'pricing_change' : 'content_change';

    const signal: SignalInsert = {
      tenant_id: monitor.tenant_id,
      competitor_id: monitor.competitor_id,
      monitor_id: monitor.id,
      signal_type: signalType,
      severity: isPricingPage ? 'critical' : 'medium',
      title: isPricingPage
        ? `${competitor.name} pricing page changed`
        : `${competitor.name} page changed: ${monitor.url}`,
      summary: `Content change detected on ${monitor.url}`,
      content: truncate(textContent, 2000),
      url: monitor.url,
      metadata: { previousHash: monitor.last_content_hash, newHash },
    };

    return { signals: [signal], metadata: { hash: newHash, changed: true } };
  }
}
