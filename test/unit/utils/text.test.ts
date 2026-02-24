// ---------------------------------------------------------------------------
// text.test.ts -- Tests for text utilities
// ---------------------------------------------------------------------------

import { truncate, stripHtml, slugify } from '../../../src/core/utils/text.js';

describe('truncate', () => {
  it('returns the original string if within maxLen', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and appends "..." when exceeding maxLen', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('handles exact boundary', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('handles very short maxLen', () => {
    const result = truncate('abcdefgh', 4);
    expect(result).toBe('a...');
    expect(result.length).toBe(4);
  });
});

describe('stripHtml', () => {
  it('strips HTML tags from a string', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });

  it('handles self-closing tags', () => {
    expect(stripHtml('line one<br/>line two')).toBe('line oneline two');
  });

  it('returns plain text unchanged', () => {
    expect(stripHtml('no tags here')).toBe('no tags here');
  });

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
  });
});

describe('slugify', () => {
  it('converts text to a lowercase hyphenated slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces non-alphanumeric characters with hyphens', () => {
    expect(slugify('Foo Bar & Baz!')).toBe('foo-bar-baz');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Hello--  ')).toBe('hello');
  });

  it('collapses multiple separators into one hyphen', () => {
    expect(slugify('a   b   c')).toBe('a-b-c');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});
