# lucid-video — Agent-Native Video Generation

**Date:** 2026-02-25
**Status:** Approved
**Author:** DaishizenSensei / RaijinLabs

## Summary

`lucid-video` is a TypeScript MCP plugin for programmatic video generation using Remotion. It enables AI agents to generate marketing content, data-driven reports, personalized outreach videos, and more — through a standardized `VideoBrief` schema that any Lucid plugin can emit.

Three-layer architecture:
1. **Plugin** (`lucid-video` in lucid-plugins) — agent-facing MCP tools
2. **Control plane** (LucidMerged `/video` dashboard) — human-facing UI
3. **Rendering engine** (Railway service) — hybrid Lambda + self-hosted Remotion rendering

## Architecture

```
                    ┌─ lucid-video plugin (MCP tools)
Agent/Human ───┤                                      ──► Rendering Engine
                    └─ LucidMerged dashboard (/video)       (Lambda/Railway)
```

### Plugin (lucid-plugins, open source, MIT)
- MCP tools: `render_video`, `list_templates`, `get_render_status`, `preview_thumbnail`, `cancel_render`
- VideoBrief schema — the cross-plugin protocol
- Calls rendering engine API

### Control Plane (LucidMerged)
- Template editor with Remotion Player preview
- Render queue + history dashboard
- Billing / quotas / usage tracking
- Template marketplace UI

### Rendering Engine (Railway service)
- Remotion bundler + renderer
- Routes to Lambda (burst) or Railway (premium)
- Both plugin and control plane call this

## VideoBrief Schema

The core differentiator. Any plugin can emit a `VideoBrief`, and `lucid-video` renders it.

```typescript
interface VideoBrief {
  template_id: string;
  scenes: Scene[];
  brand?: {
    colors: { primary: string; secondary: string; background: string };
    fonts?: { heading: string; body: string };
    logo_url?: string;
    watermark?: boolean;
  };
  audio?: {
    background_track?: string;
    voiceover_text?: string;
    volume?: number;
  };
  output: {
    format: "mp4" | "webm" | "gif";
    resolution: "1080p" | "720p" | "square" | "story" | "reel";
    duration_hint?: number;
    fps?: 30 | 60;
  };
  data_bindings?: Record<string, unknown>;
  priority?: "burst" | "standard";
}

interface Scene {
  type: "title" | "data-chart" | "text-overlay" | "image-showcase" | "transition" | "cta";
  duration: number;
  props: Record<string, unknown>;
}
```

### Cross-Plugin Data Flow

| Source Plugin | Brief Type | Data Fed |
|---|---|---|
| lucid-metrics | metrics-report-v1 | KPIs, chart data, period comparison |
| lucid-prospect | personalized-outreach-v1 | Prospect name, company, pain points |
| lucid-hype | social-clip-v1 | Hook text, CTA, platform specs |
| lucid-veille | news-digest-v1 | Headlines, summaries, trend data |
| lucid-compete | competitor-update-v1 | Competitor moves, positioning diffs |

## MCP Tools

### render_video(brief: VideoBrief)
Validates brief, routes to Lambda or Railway, returns `{ render_id, estimated_seconds, status_url }`.

### list_templates(category?: string, resolution?: string)
Queries templates table, returns `{ id, name, category, thumbnail_url, scene_types[], preview_url }`.

### get_render_status(render_id: string)
Polls queue + renderer progress, returns `{ status, progress_pct, video_url?, thumbnail_url?, error? }`.

### preview_thumbnail(brief: VideoBrief)
Renders frame 0 only (<3s), returns `{ thumbnail_url }`.

### cancel_render(render_id: string)
Kills Lambda/Railway process, returns `{ cancelled: boolean }`.

## Control Plane — LucidMerged Routes

```
app/(dashboard)/video/
  page.tsx                    # Render queue + history
  templates/
    page.tsx                  # Template browser (grid, filters)
    [id]/
      page.tsx                # Template editor + Remotion Player preview
  renders/
    [id]/
      page.tsx                # Render detail: progress, download, share
  settings/
    page.tsx                  # Lambda/Railway config, quotas, API keys
```

## Rendering Engine

### Infrastructure
- **Fastify API** on Railway
- **Remotion bundler** — caches bundles per template version
- **Router** — Lambda for `priority: "burst"`, Railway local for `priority: "standard"`
- **Job queue** — Upstash Redis

### Flow
```
Brief arrives → validate against template schema
             → check quota (Supabase)
             → enqueue in Upstash Redis
             → router decides:
                burst    → Lambda (parallel chunks, ~2min)
                standard → Railway local renderer (~5min)
             → on complete: store URL in Supabase, notify via webhook
```

## Data Model (Supabase)

```sql
-- Templates registry
templates (id, name, category, description, composition_path,
           schema_json, thumbnail_url, is_public, created_by, created_at)

-- Render jobs
renders (id, workspace_id, template_id, brief_json, status,
         progress_pct, video_url, thumbnail_url, renderer,
         duration_ms, cost_cents, error, created_at, completed_at)

-- Quotas
video_quotas (workspace_id, monthly_renders, monthly_used,
              max_duration_sec, allowed_renderers, reset_at)
```

## Starter Templates (5)

| Template ID | Category | Use Case |
|---|---|---|
| metrics-weekly-v1 | Data reports | Weekly KPI video for Slack/email |
| social-clip-v1 | Marketing | Short-form social content (reels/stories) |
| personalized-outreach-v1 | Sales | 1:1 prospect video |
| changelog-v1 | Product | Release notes as video |
| team-update-v1 | Internal | Weekly standup summary |

## Competitive Advantage

- First agent-native video generation (MCP tools)
- Cross-plugin VideoBrief protocol (no competitor has this)
- Open source plugin + proprietary control plane (adoption flywheel + moat)
- Hybrid rendering (Lambda burst + Railway premium)
- Future: AI customization layer (Approach C evolution)
