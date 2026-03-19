import { describe, it, expect } from 'vitest';
import {
  toIsoDate,
  toIsoDateTime,
  daysBetween,
  taxYearRange,
  isInTaxYear,
  currentTaxYear,
} from '../src/core/utils/date.js';

describe('Date Utilities', () => {
  describe('toIsoDate', () => {
    it('should format Date to YYYY-MM-DD', () => {
      expect(toIsoDate(new Date('2024-06-15T14:30:00Z'))).toBe('2024-06-15');
    });

    it('should format timestamp to YYYY-MM-DD', () => {
      const ts = new Date('2024-01-01T00:00:00Z').getTime();
      expect(toIsoDate(ts)).toBe('2024-01-01');
    });

    it('should format string to YYYY-MM-DD', () => {
      expect(toIsoDate('2024-12-25T10:00:00Z')).toBe('2024-12-25');
    });
  });

  describe('toIsoDateTime', () => {
    it('should return full ISO datetime', () => {
      const result = toIsoDateTime('2024-06-15T14:30:00Z');
      expect(result).toContain('2024-06-15');
      expect(result).toContain('14:30:00');
    });
  });

  describe('daysBetween', () => {
    it('should calculate days correctly', () => {
      expect(daysBetween('2024-01-01', '2024-01-31')).toBe(30);
    });

    it('should return 0 for same date', () => {
      expect(daysBetween('2024-06-15', '2024-06-15')).toBe(0);
    });

    it('should handle reverse order', () => {
      expect(daysBetween('2024-12-31', '2024-01-01')).toBe(365);
    });
  });

  describe('taxYearRange', () => {
    it('should return start and end of year', () => {
      const range = taxYearRange(2024);
      expect(range.start).toBe('2024-01-01');
      expect(range.end).toBe('2024-12-31');
    });
  });

  describe('isInTaxYear', () => {
    it('should detect date in correct year', () => {
      expect(isInTaxYear('2024-06-15', 2024)).toBe(true);
      expect(isInTaxYear('2024-06-15', 2023)).toBe(false);
    });
  });

  describe('currentTaxYear', () => {
    it('should return current year', () => {
      expect(currentTaxYear()).toBe(new Date().getFullYear());
    });
  });
});
