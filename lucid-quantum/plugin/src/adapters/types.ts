// ---------------------------------------------------------------------------
// adapters/types.ts -- BQ API adapter interface
// ---------------------------------------------------------------------------

/** HTTP method */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Generic API response */
export type ApiResponse = Record<string, unknown> | unknown[];

/** Adapter configuration */
export interface AdapterConfig {
  apiUrl: string;
  apiKey: string;
  adminSecret: string;
  timeout: number;
}

/** Before Quantum API adapter interface */
export interface IBqAdapter {
  request(method: HttpMethod, path: string, opts?: {
    params?: Record<string, string | number>;
    body?: Record<string, unknown>;
    admin?: boolean;
  }): Promise<ApiResponse>;
}
