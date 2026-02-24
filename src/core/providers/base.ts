import Bottleneck from 'bottleneck';
import { logger } from '../utils/logger.js';

/**
 * Base class for rate-limited API providers.
 */
export abstract class BaseProvider {
  protected readonly limiter: Bottleneck;
  public abstract readonly name: string;

  constructor(maxConcurrent = 2, minTime = 250) {
    this.limiter = new Bottleneck({ maxConcurrent, minTime });
    this.limiter.on('failed', (error, jobInfo) => {
      logger.warn(`${this.name} job failed (attempt ${jobInfo.retryCount}): ${String(error)}`);
      if (jobInfo.retryCount < 2) return 1000 * (jobInfo.retryCount + 1);
      return undefined;
    });
  }

  /**
   * Wrap an API call with rate limiting.
   */
  protected schedule<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(fn);
  }
}
