/**
 * Return an ISO date string (YYYY-MM-DD) from a Date or timestamp.
 */
export function toIsoDate(input: Date | string | number): string {
  const d = typeof input === 'string' ? new Date(input) : new Date(input);
  return d.toISOString().slice(0, 10);
}

/**
 * Return an ISO datetime string from a Date or timestamp.
 */
export function toIsoDateTime(input: Date | string | number): string {
  const d = typeof input === 'string' ? new Date(input) : new Date(input);
  return d.toISOString();
}

/**
 * Calculate the number of days between two dates.
 */
export function daysBetween(a: Date | string, b: Date | string): number {
  const dateA = typeof a === 'string' ? new Date(a) : a;
  const dateB = typeof b === 'string' ? new Date(b) : b;
  const ms = Math.abs(dateB.getTime() - dateA.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Get the start and end dates of a given tax year.
 */
export function taxYearRange(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

/**
 * Check if a date falls within a given tax year.
 */
export function isInTaxYear(date: string | Date, year: number): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getFullYear() === year;
}

/**
 * Get the current tax year.
 */
export function currentTaxYear(): number {
  return new Date().getFullYear();
}
