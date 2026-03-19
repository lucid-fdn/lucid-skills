// ---------------------------------------------------------------------------
// tool-types.test.ts -- Tests for tool result helpers
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { ok, err } from '../../src/tools/types.js';

describe('ok', () => {
  it('wraps string data', () => {
    const result = ok('hello');
    expect(result.content).toHaveLength(1);
    expect(result.content[0]!.type).toBe('text');
    expect(result.content[0]!.text).toBe('hello');
    expect(result.isError).toBeUndefined();
  });

  it('wraps object data as JSON', () => {
    const result = ok({ foo: 'bar', count: 42 });
    expect(result.content[0]!.type).toBe('text');
    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed.foo).toBe('bar');
    expect(parsed.count).toBe(42);
  });

  it('wraps number data as string', () => {
    const result = ok(42);
    expect(result.content[0]!.text).toBe('42');
  });

  it('wraps null data', () => {
    const result = ok(null);
    expect(result.content[0]!.text).toBe('null');
  });

  it('wraps array data as JSON', () => {
    const result = ok([1, 2, 3]);
    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed).toEqual([1, 2, 3]);
  });
});

describe('err', () => {
  it('creates error result', () => {
    const result = err('something went wrong');
    expect(result.content).toHaveLength(1);
    expect(result.content[0]!.text).toBe('Error: something went wrong');
    expect(result.isError).toBe(true);
  });

  it('prefixes message with Error:', () => {
    const result = err('fail');
    expect(result.content[0]!.text).toMatch(/^Error:/)
  });
});
