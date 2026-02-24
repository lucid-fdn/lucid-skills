// ---------------------------------------------------------------------------
// hash.ts -- Content hashing for web-diff change detection
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';

/**
 * Return a SHA-256 hex digest of the given text.
 * Used for web-diff change detection.
 */
export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
