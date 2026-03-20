// ---------------------------------------------------------------------------
// retry.ts -- Retry with exponential backoff
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /** Maximum number of attempts (including the initial call). @default 3 */
  maxAttempts?: number;
  /** Base delay in milliseconds before the first retry. @default 1000 */
  baseDelay?: number;
}

/**
 * Execute `fn` with exponential-backoff retries.
 *
 * Delay between retries: `baseDelay * 2^(attempt - 1)`.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions,
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  const baseDelay = opts?.baseDelay ?? 1000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
