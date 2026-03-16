// ---------------------------------------------------------------------------
// text.ts -- Text manipulation utilities
// ---------------------------------------------------------------------------

/**
 * Truncate `text` to at most `maxLen` characters, appending "..." if truncated.
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Strip HTML tags from a string using a basic regex.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Convert text to a URL-friendly slug.
 *
 * Lowercases, replaces non-alphanumeric runs with hyphens,
 * and trims leading/trailing hyphens.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
