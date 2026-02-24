/**
 * Truncate a string to maxLen, appending an ellipsis if truncated.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '\u2026';
}

/**
 * Format a USD value with commas and two decimals.
 */
export function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Abbreviate a wallet address for display: 0x1234...abcd
 */
export function abbreviateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a snake_case string to Title Case.
 */
export function snakeToTitle(str: string): string {
  return str
    .split('_')
    .map((w) => capitalize(w))
    .join(' ');
}

/**
 * Safely parse a numeric string, returning undefined on failure.
 */
export function safeParseNumber(val: string | undefined | null): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Mask a string for safe logging (e.g., API keys).
 */
export function mask(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars) return '****';
  return value.slice(0, visibleChars) + '****';
}
