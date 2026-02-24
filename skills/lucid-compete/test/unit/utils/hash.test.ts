// ---------------------------------------------------------------------------
// hash.test.ts -- Tests for contentHash utility
// ---------------------------------------------------------------------------

import { contentHash } from '../../../src/core/utils/hash.js';

describe('contentHash', () => {
  it('returns a consistent hex string for the same input', () => {
    const hash1 = contentHash('hello world');
    const hash2 = contentHash('hello world');
    expect(hash1).toBe(hash2);
  });

  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = contentHash('test');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns different hashes for different content', () => {
    const hashA = contentHash('content A');
    const hashB = contentHash('content B');
    expect(hashA).not.toBe(hashB);
  });

  it('handles empty string', () => {
    const hash = contentHash('');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
