// ---------------------------------------------------------------------------
// date.ts -- Date utility helpers
// ---------------------------------------------------------------------------

/**
 * Return a date formatted as YYYY-MM-DD.
 * Defaults to the current date if none is provided.
 */
export function toISODate(date?: Date): string {
  const d = date ?? new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * Return a `Date` that is `n` days before now.
 */
export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Format a date as a human-readable relative string
 * (e.g., "2 hours ago", "3 days ago", "just now").
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diffMs = now - d.getTime();

  if (diffMs < 0) return 'in the future';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
