import type { VideoBrief } from '../types/video-brief.js';
import type { RenderResponse, RenderStatusResponse, TemplateListItem } from '../types/index.js';
import { log } from '../utils/logger.js';

export interface EngineClientConfig {
  engineUrl: string;
  engineApiKey?: string;
}

export class EngineClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: EngineClientConfig) {
    this.baseUrl = config.engineUrl.replace(/\/$/, '');
    this.apiKey = config.engineApiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    };

    log.debug(`Engine request: ${options.method ?? 'GET'} ${path}`);

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Engine API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async render(brief: VideoBrief): Promise<RenderResponse> {
    return this.request<RenderResponse>('/render', {
      method: 'POST',
      body: JSON.stringify(brief),
    });
  }

  async getStatus(renderId: string): Promise<RenderStatusResponse> {
    return this.request<RenderStatusResponse>(`/render/${renderId}`);
  }

  async listTemplates(category?: string): Promise<TemplateListItem[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request<TemplateListItem[]>(`/templates${query}`);
  }

  async thumbnail(brief: VideoBrief): Promise<{ thumbnail_url: string }> {
    return this.request<{ thumbnail_url: string }>('/thumbnail', {
      method: 'POST',
      body: JSON.stringify(brief),
    });
  }

  async cancel(renderId: string): Promise<{ cancelled: boolean }> {
    return this.request<{ cancelled: boolean }>(`/render/${renderId}/cancel`, {
      method: 'POST',
    });
  }
}
