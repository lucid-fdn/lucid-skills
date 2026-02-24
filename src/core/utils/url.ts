/**
 * Safely join URL path segments.
 */
export function joinUrl(base: string, ...segments: string[]): string {
  const trimmedBase = base.replace(/\/+$/, '');
  const path = segments.map((s) => s.replace(/^\/+|\/+$/g, '')).join('/');
  return `${trimmedBase}/${path}`;
}

/**
 * Append query parameters to a URL.
 */
export function appendParams(url: string, params: Record<string, string | number | undefined>): string {
  const u = new URL(url);
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined) u.searchParams.set(key, String(val));
  }
  return u.toString();
}

/**
 * Validate that a string is a well-formed URL.
 */
export function isValidUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}
