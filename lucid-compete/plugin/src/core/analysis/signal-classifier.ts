import type { SignalInsert, Severity } from '../types/index.js';

export function classifySignal(signal: SignalInsert): Severity {
  // Content change on pricing URL → critical
  if (signal.signal_type === 'pricing_change') return 'critical';
  if (signal.signal_type === 'content_change') {
    if (signal.url?.toLowerCase().includes('pricing')) return 'critical';
    return 'medium';
  }

  // Funding
  if (signal.signal_type === 'funding_round') {
    const amount = (signal.metadata as Record<string, unknown>)?.amount as number | undefined;
    return amount && amount > 10_000_000 ? 'critical' : 'high';
  }

  // Launches
  if (signal.signal_type === 'feature_launch') return 'high';

  // Releases
  if (signal.signal_type === 'release') {
    const tag = (signal.metadata as Record<string, unknown>)?.tag as string | undefined;
    if (tag && /^v?\d+\.0\.0/.test(tag)) return 'high';
    return 'medium';
  }

  // Job postings
  if (signal.signal_type === 'job_posting') {
    if (/\b(vp|vice president|director|head of|chief|cto|cfo|coo)\b/i.test(signal.title)) return 'high';
    return 'medium';
  }

  // Reviews
  if (signal.signal_type === 'review') return 'medium';

  // Social mentions
  if (signal.signal_type === 'social_mention') return 'low';

  // News
  if (signal.signal_type === 'news') return 'medium';

  // Default
  return 'medium';
}
