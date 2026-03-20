// ---------------------------------------------------------------------------
// common.ts -- Enums / union types used across the compete domain
// ---------------------------------------------------------------------------

/** Supported monitor source types. */
export type MonitorType =
  | 'web-diff'
  | 'github'
  | 'rss'
  | 'jobs'
  | 'npm'
  | 'twitter'
  | 'reddit'
  | 'producthunt'
  | 'g2'
  | 'crunchbase'
  | 'linkedin'
  | 'hackernews';

/** All valid MonitorType values. */
export const MONITOR_TYPES: readonly MonitorType[] = [
  'web-diff',
  'github',
  'rss',
  'jobs',
  'npm',
  'twitter',
  'reddit',
  'producthunt',
  'g2',
  'crunchbase',
  'linkedin',
  'hackernews',
] as const;

/** Categories of competitive signals. */
export type SignalType =
  | 'pricing_change'
  | 'feature_launch'
  | 'funding_round'
  | 'new_hire'
  | 'job_posting'
  | 'release'
  | 'review'
  | 'social_mention'
  | 'news'
  | 'content_change'
  | 'other';

/** All valid SignalType values. */
export const SIGNAL_TYPES: readonly SignalType[] = [
  'pricing_change',
  'feature_launch',
  'funding_round',
  'new_hire',
  'job_posting',
  'release',
  'review',
  'social_mention',
  'news',
  'content_change',
  'other',
] as const;

/** Signal severity levels, lowest to highest. */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

/** All valid Severity values (ordered low -> critical). */
export const SEVERITIES: readonly Severity[] = [
  'low',
  'medium',
  'high',
  'critical',
] as const;

/** Brief cadence. */
export type BriefType = 'weekly' | 'monthly';

/** All valid BriefType values. */
export const BRIEF_TYPES: readonly BriefType[] = [
  'weekly',
  'monthly',
] as const;

/** Alert delivery channels. */
export type NotifierType = 'slack' | 'webhook' | 'email';

/** All valid NotifierType values. */
export const NOTIFIER_TYPES: readonly NotifierType[] = [
  'slack',
  'webhook',
  'email',
] as const;

/** Lifecycle status of an alert. */
export type AlertStatus = 'pending' | 'sent' | 'failed';

/** All valid AlertStatus values. */
export const ALERT_STATUSES: readonly AlertStatus[] = [
  'pending',
  'sent',
  'failed',
] as const;
