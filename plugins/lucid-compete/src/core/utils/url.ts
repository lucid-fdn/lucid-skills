// ---------------------------------------------------------------------------
// url.ts -- URL normalization and domain extraction
// ---------------------------------------------------------------------------

/**
 * Normalize a URL by lowering the protocol/host, stripping trailing slashes,
 * and defaulting bare domains to `https://`.
 */
export function normalizeUrl(url: string): string {
  let u = url.trim();

  // If there is no protocol, assume https
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }

  // Use URL constructor for reliable parsing
  const parsed = new URL(u);

  // Rebuild with lowered protocol + host, preserving path (strip trailing /)
  const path = parsed.pathname.replace(/\/+$/, '') || '';
  const search = parsed.search || '';
  const hash = parsed.hash || '';

  return `${parsed.protocol}//${parsed.host}${path}${search}${hash}`;
}

/**
 * Extract the domain (hostname) from a URL string.
 */
export function extractDomain(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return new URL(u).hostname;
}
