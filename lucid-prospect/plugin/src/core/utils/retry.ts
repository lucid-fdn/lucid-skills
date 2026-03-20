import { logger } from './logger.js';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, opts?: RetryOptions): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...opts };

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        logger.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, lastError.message);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}
