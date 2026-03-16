// ---------------------------------------------------------------------------
// g2.ts -- G2 Review Monitor fetcher
// ---------------------------------------------------------------------------

import { BaseFetcher } from './base.js';
import type { Monitor, Competitor, FetchResult, SignalInsert, MonitorType } from '../types/index.js';
import { truncate } from '../utils/index.js';

interface JsonLdReview {
  '@type'?: string;
  review?: JsonLdReview | JsonLdReview[];
  name?: string;
  headline?: string;
  reviewBody?: string;
  reviewRating?: { ratingValue?: number };
}

export class G2Fetcher extends BaseFetcher {
  readonly monitorType: MonitorType = 'g2';
  readonly name = 'G2 Review Monitor';

  isConfigured(): boolean {
    return true;
  }

  protected async doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    const res = await fetch(monitor.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CompeteBot/1.0)' },
    });
    if (!res.ok) throw new Error(`G2 returned ${res.status}`);

    const html = await res.text();
    const signals: SignalInsert[] = [];

    // Try to extract JSON-LD review data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const content = match.replace(/<\/?script[^>]*>/g, '');
          const jsonLd = JSON.parse(content) as JsonLdReview;
          if (jsonLd['@type'] === 'Review' || jsonLd.review) {
            const reviews: JsonLdReview[] = jsonLd.review
              ? (Array.isArray(jsonLd.review) ? jsonLd.review : [jsonLd.review])
              : [jsonLd];
            for (const review of reviews) {
              signals.push({
                tenant_id: monitor.tenant_id,
                competitor_id: monitor.competitor_id,
                monitor_id: monitor.id,
                signal_type: 'review',
                severity: 'medium',
                title: `${competitor.name} G2 review: ${truncate(review.name ?? review.headline ?? 'New review', 200)}`,
                summary: truncate(review.reviewBody ?? '', 500),
                url: monitor.url,
                metadata: { rating: review.reviewRating?.ratingValue, source: 'g2' },
              });
            }
          }
        } catch {
          /* ignore parse errors */
        }
      }
    }

    return { signals, metadata: { reviewCount: signals.length } };
  }
}
