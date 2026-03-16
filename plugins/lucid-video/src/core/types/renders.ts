export type RenderStatus = 'queued' | 'bundling' | 'rendering' | 'completed' | 'failed' | 'cancelled';
export type Renderer = 'lambda' | 'railway';

export interface RenderJob {
  id: string;
  workspace_id: string;
  template_id: string;
  brief_json: Record<string, unknown>;
  status: RenderStatus;
  progress_pct: number;
  video_url: string | null;
  thumbnail_url: string | null;
  renderer: Renderer;
  duration_ms: number | null;
  cost_cents: number | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface RenderResponse {
  render_id: string;
  estimated_seconds: number;
  status: RenderStatus;
}

export interface RenderStatusResponse {
  status: RenderStatus;
  progress_pct: number;
  video_url: string | null;
  thumbnail_url: string | null;
  error: string | null;
}
