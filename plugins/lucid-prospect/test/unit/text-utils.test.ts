import { describe, it, expect } from 'vitest';
import { truncate, stripHtml, formatNumber, formatUsd, formatPct } from '../../src/core/utils/text.js';

describe('Text Utils', () => {
  describe('truncate', () => {
    it('should not truncate short strings', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should truncate long strings with ellipsis', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
    });

    it('should use custom suffix', () => {
      expect(truncate('hello world', 9, '~')).toBe('hello wo~');
    });

    it('should handle exact length', () => {
      expect(truncate('hello', 5)).toBe('hello');
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('should handle entities', () => {
      expect(stripHtml('Hello&amp;World')).toBe('Hello World');
    });

    it('should collapse whitespace', () => {
      expect(stripHtml('Hello   World')).toBe('Hello World');
    });
  });

  describe('formatNumber', () => {
    it('should format thousands', () => {
      expect(formatNumber(1500)).toBe('1.5K');
    });

    it('should format millions', () => {
      expect(formatNumber(2500000)).toBe('2.5M');
    });

    it('should format billions', () => {
      expect(formatNumber(1000000000)).toBe('1B');
    });

    it('should not format small numbers', () => {
      expect(formatNumber(999)).toBe('999');
    });
  });

  describe('formatUsd', () => {
    it('should format cents to dollars', () => {
      expect(formatUsd(1000)).toBe('$10.00');
    });

    it('should format zero', () => {
      expect(formatUsd(0)).toBe('$0.00');
    });
  });

  describe('formatPct', () => {
    it('should format ratio to percentage', () => {
      expect(formatPct(0.756)).toBe('75.6%');
    });

    it('should format zero', () => {
      expect(formatPct(0)).toBe('0.0%');
    });

    it('should format 100%', () => {
      expect(formatPct(1)).toBe('100.0%');
    });
  });
});
