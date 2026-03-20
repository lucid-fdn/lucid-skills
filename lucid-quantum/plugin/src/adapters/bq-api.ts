// ---------------------------------------------------------------------------
// adapters/bq-api.ts -- Before Quantum HTTP API adapter
// ---------------------------------------------------------------------------

import type { AdapterConfig, ApiResponse, HttpMethod, IBqAdapter } from './types.js';
import { log } from '../utils/logger.js';

export class BqApiAdapter implements IBqAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly adminSecret: string;
  private readonly timeout: number;

  constructor(config: AdapterConfig) {
    this.baseUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.adminSecret = config.adminSecret;
    this.timeout = config.timeout * 1000; // ms
  }

  async request(
    method: HttpMethod,
    path: string,
    opts?: {
      params?: Record<string, string | number>;
      body?: Record<string, unknown>;
      admin?: boolean;
    },
  ): Promise<ApiResponse> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (opts?.params) {
      for (const [k, v] of Object.entries(opts.params)) {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    if (opts?.admin && this.adminSecret) {
      headers['X-Admin-Secret'] = this.adminSecret;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json() as ApiResponse;

      if (!response.ok) {
        const detail = (data as Record<string, unknown>)?.detail ?? response.statusText;
        log.error(`API ${method} ${path} failed`, undefined, {
          status: response.status,
          detail: String(detail),
        });
        return { error: true, statusCode: response.status, detail };
      }

      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { error: true, detail: `Request to ${this.baseUrl}${path} timed out after ${this.timeout}ms` };
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
