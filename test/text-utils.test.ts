// ---------------------------------------------------------------------------
// text-utils.test.ts -- Tests for text utility functions
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  normalizeSource,
  findLineNumber,
  countOccurrences,
  isValidAddress,
  truncate,
  extractFunctionSignatures,
  extractPragmaVersion,
  hashFinding,
  formatScoreBar,
  splitContracts,
  stripHtml,
  formatNumber,
} from '../src/core/utils/text.js';

describe('normalizeSource', () => {
  it('removes single-line comments', () => {
    const result = normalizeSource('uint x; // this is a comment\nuint y;');
    expect(result).not.toContain('this is a comment');
    expect(result).toContain('uint x;');
    expect(result).toContain('uint y;');
  });

  it('removes multi-line comments', () => {
    const result = normalizeSource('uint x; /* block\ncomment */ uint y;');
    expect(result).not.toContain('block');
    expect(result).toContain('uint x;');
    expect(result).toContain('uint y;');
  });

  it('normalizes excess whitespace', () => {
    const result = normalizeSource('uint   x;\n\n\n\nuint y;');
    expect(result).toBe('uint x;\n\nuint y;');
  });

  it('trims leading and trailing whitespace', () => {
    const result = normalizeSource('  uint x;  ');
    expect(result).toBe('uint x;');
  });
});

describe('findLineNumber', () => {
  it('returns correct line number', () => {
    const source = 'line1\nline2\nline3\ntarget';
    expect(findLineNumber(source, 'target')).toBe(4);
  });

  it('returns 1 for match on first line', () => {
    expect(findLineNumber('target\nother', 'target')).toBe(1);
  });

  it('returns -1 for no match', () => {
    expect(findLineNumber('abc', 'xyz')).toBe(-1);
  });
});

describe('countOccurrences', () => {
  it('counts matches', () => {
    expect(countOccurrences('aaa bbb aaa', /aaa/)).toBe(2);
  });

  it('returns 0 for no matches', () => {
    expect(countOccurrences('abc', /xyz/)).toBe(0);
  });

  it('respects case-insensitive flag', () => {
    expect(countOccurrences('ABC abc Abc', /abc/i)).toBe(3);
  });
});

describe('isValidAddress', () => {
  it('validates correct addresses', () => {
    expect(isValidAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    expect(isValidAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
  });

  it('rejects invalid addresses', () => {
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('0x')).toBe(false);
    expect(isValidAddress('0x123')).toBe(false);
    expect(isValidAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false);
    expect(isValidAddress('0xGGGG567890abcdef1234567890abcdef12345678')).toBe(false);
  });
});

describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('extractFunctionSignatures', () => {
  it('extracts function signatures', () => {
    const source = 'function transfer(address to, uint256 amount) public {}';
    const sigs = extractFunctionSignatures(source);
    expect(sigs).toContain('function transfer(address to, uint256 amount)');
  });

  it('extracts multiple functions', () => {
    const source = `
      function foo() public {}
      function bar(uint256 x) external returns (bool) {}
    `;
    const sigs = extractFunctionSignatures(source);
    expect(sigs.length).toBe(2);
  });

  it('returns empty array for no functions', () => {
    expect(extractFunctionSignatures('uint256 x;')).toEqual([]);
  });
});

describe('extractPragmaVersion', () => {
  it('extracts caret version', () => {
    expect(extractPragmaVersion('pragma solidity ^0.8.19;')).toBe('^0.8.19');
  });

  it('extracts range version', () => {
    expect(extractPragmaVersion('pragma solidity >=0.6.0 <0.9.0;')).toBe('>=0.6.0 <0.9.0');
  });

  it('returns null for no pragma', () => {
    expect(extractPragmaVersion('contract Foo {}')).toBeNull();
  });
});

describe('hashFinding', () => {
  it('produces consistent hashes', () => {
    const h1 = hashFinding('reentrancy', 'Reentrancy', 'Line 5');
    const h2 = hashFinding('reentrancy', 'Reentrancy', 'Line 5');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different inputs', () => {
    const h1 = hashFinding('reentrancy', 'Reentrancy', 'Line 5');
    const h2 = hashFinding('overflow', 'Overflow', 'Line 10');
    expect(h1).not.toBe(h2);
  });
});

describe('formatScoreBar', () => {
  it('formats 100/100 correctly', () => {
    const bar = formatScoreBar(100);
    expect(bar).toContain('100/100');
    expect(bar).toContain('#'.repeat(20));
  });

  it('formats 0/100 correctly', () => {
    const bar = formatScoreBar(0);
    expect(bar).toContain('0/100');
    expect(bar).toContain('-'.repeat(20));
  });

  it('formats 50/100 with custom width', () => {
    const bar = formatScoreBar(50, 10);
    expect(bar).toContain('50/100');
  });
});

describe('splitContracts', () => {
  it('splits multiple contracts', () => {
    const source = `
      contract A { uint x; }
      library B { function foo() internal {} }
      interface C { function bar() external; }
    `;
    const contracts = splitContracts(source);
    expect(contracts.length).toBe(3);
    expect(contracts.map((c) => c.name)).toEqual(['A', 'B', 'C']);
  });

  it('returns empty for no contracts', () => {
    expect(splitContracts('uint x;')).toEqual([]);
  });
});

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello');
  });

  it('handles nested tags', () => {
    expect(stripHtml('<div><span>text</span></div>')).toBe('text');
  });
});

describe('formatNumber', () => {
  it('formats billions', () => {
    expect(formatNumber(1_500_000_000)).toBe('1.50B');
  });

  it('formats millions', () => {
    expect(formatNumber(2_500_000)).toBe('2.50M');
  });

  it('formats thousands', () => {
    expect(formatNumber(42_000)).toBe('42.00K');
  });

  it('formats small numbers', () => {
    expect(formatNumber(42)).toBe('42.00');
  });
});
