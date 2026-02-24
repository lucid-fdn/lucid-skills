import { describe, it, expect } from 'vitest';
import {
  truncate,
  formatUsd,
  abbreviateAddress,
  capitalize,
  snakeToTitle,
  safeParseNumber,
  mask,
} from '../src/core/utils/text.js';

describe('Text Utilities', () => {
  describe('truncate', () => {
    it('should return short strings unchanged', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should truncate long strings with ellipsis', () => {
      const result = truncate('hello world', 6);
      expect(result).toHaveLength(6);
      expect(result.endsWith('\u2026')).toBe(true);
    });

    it('should handle exact length', () => {
      expect(truncate('abc', 3)).toBe('abc');
    });
  });

  describe('formatUsd', () => {
    it('should format positive amounts', () => {
      const result = formatUsd(1234.56);
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('56');
      expect(result.startsWith('$')).toBe(true);
    });

    it('should format zero', () => {
      expect(formatUsd(0)).toBe('$0.00');
    });

    it('should format negative amounts', () => {
      const result = formatUsd(-500);
      expect(result).toContain('500');
    });
  });

  describe('abbreviateAddress', () => {
    it('should abbreviate long addresses', () => {
      const addr = '0x1234567890abcdef1234567890abcdef12345678';
      const result = abbreviateAddress(addr);
      expect(result).toContain('0x1234');
      expect(result).toContain('5678');
      expect(result).toContain('...');
    });

    it('should return short strings unchanged', () => {
      expect(abbreviateAddress('0x12')).toBe('0x12');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('snakeToTitle', () => {
    it('should convert snake_case to Title Case', () => {
      expect(snakeToTitle('short_term')).toBe('Short Term');
      expect(snakeToTitle('capital_gain')).toBe('Capital Gain');
    });

    it('should handle single word', () => {
      expect(snakeToTitle('hello')).toBe('Hello');
    });
  });

  describe('safeParseNumber', () => {
    it('should parse valid numbers', () => {
      expect(safeParseNumber('42')).toBe(42);
      expect(safeParseNumber('3.14')).toBe(3.14);
    });

    it('should return undefined for invalid input', () => {
      expect(safeParseNumber('abc')).toBeUndefined();
      expect(safeParseNumber(undefined)).toBeUndefined();
      expect(safeParseNumber(null)).toBeUndefined();
      expect(safeParseNumber('')).toBeUndefined();
    });
  });

  describe('mask', () => {
    it('should mask API keys', () => {
      expect(mask('sk-1234567890')).toBe('sk-1****');
    });

    it('should handle short strings', () => {
      expect(mask('ab')).toBe('****');
    });
  });
});
