export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function normalizeUrl(str: string): string {
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    str = 'https://' + str;
  }
  try {
    const url = new URL(str);
    return url.href.replace(/\/+$/, '');
  } catch {
    return str;
  }
}

export function extractDomain(url: string): string {
  try {
    const normalized = normalizeUrl(url);
    const parsed = new URL(normalized);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

export function buildUrl(base: string, path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, base);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}
