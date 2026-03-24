# lucid-video Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `lucid-video`, a TypeScript MCP plugin for agent-native video generation using Remotion, following the patterns established by lucid-veille.

**Architecture:** Three layers — (1) MCP plugin in lucid-plugins with 5 tools and a VideoBrief schema, (2) rendering engine service for hybrid Lambda/Railway rendering, (3) control plane routes in LucidMerged. This plan covers layer 1 (the plugin) and its documentation.

**Tech Stack:** TypeScript, Remotion (`@remotion/renderer`, `@remotion/bundler`, `@remotion/lambda`), MCP SDK, Zod, Supabase, Upstash Redis, tsup, vitest

**Design Doc:** `docs/plans/2026-02-25-lucid-video-design.md`

---

## Task 1: Scaffold Plugin Structure

**Files:**
- Create: `skills/lucid-video/package.json`
- Create: `skills/lucid-video/tsconfig.json`
- Create: `skills/lucid-video/tsup.config.ts`
- Create: `skills/lucid-video/vitest.config.ts`
- Create: `skills/lucid-video/.prettierrc`
- Create: `skills/lucid-video/.gitignore`
- Create: `skills/lucid-video/skill.yaml`
- Create: `skills/lucid-video/openclaw.plugin.json`
- Create: `skills/lucid-video/HEARTBEAT.md`

**Step 1: Create package.json**

```json
{
  "name": "@raijinlabs/video",
  "version": "1.0.0",
  "description": "Agent-native video generation using Remotion — MCP server + OpenClaw plugin",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "video-mcp": "./dist/bin.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./mcp": {
      "import": "./dist/mcp.js",
      "types": "./dist/mcp.d.ts"
    },
    "./core": {
      "import": "./dist/core/index.js",
      "types": "./dist/core/index.d.ts"
    }
  },
  "files": [
    "dist",
    "openclaw.plugin.json",
    "skills",
    "docs"
  ],
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/lucid-fdn/lucid-plugins.git",
    "directory": "skills/lucid-video"
  },
  "keywords": [
    "openclaw", "mcp", "plugin", "video", "remotion",
    "rendering", "ai", "agent", "lucid"
  ],
  "author": "RaijinLabs",
  "openclaw": {
    "extensions": ["./src/index.ts"]
  },
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "lint": "prettier --check .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "@sinclair/typebox": "^0.32.0",
    "@supabase/supabase-js": "^2.45.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@vitest/coverage-v8": "^1.6.0",
    "prettier": "^3.3.0",
    "tsup": "^8.1.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT"
}
```

Note: Remotion deps (`@remotion/renderer`, `@remotion/bundler`, `@remotion/lambda`) are NOT included in the plugin. The plugin calls a rendering engine API over HTTP. The rendering engine is a separate service. This keeps the plugin lightweight and distributable.

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/mcp.ts', 'src/openclaw.ts', 'src/bin.ts', 'src/core/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  outDir: 'dist',
});
```

**Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/types/**'],
    },
  },
});
```

**Step 5: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

**Step 6: Create .gitignore**

```
node_modules/
dist/
coverage/
*.tsbuildinfo
.env
.env.*
```

**Step 7: Create skill.yaml**

```yaml
lucid: "1.0"
name: lucid-video
version: "1.0.0"
description: "Agent-native video generation using Remotion — marketing content, data reports, personalized outreach"
author: "RaijinLabs"
license: "MIT"

requires:
  mcps: []
  env:
    - VIDEO_ENGINE_URL
    - VIDEO_SUPABASE_URL
    - VIDEO_SUPABASE_KEY

skills:
  - social-content
  - data-reports
  - personalized-outreach

heartbeat: HEARTBEAT.md
platforms:
  claude-code: true
  openclaw: true
```

**Step 8: Create openclaw.plugin.json**

```json
{
  "name": "lucid-video",
  "version": "1.0.0",
  "description": "Agent-native video generation using Remotion",
  "author": "RaijinLabs",
  "license": "MIT",
  "skills": [
    "skills/social-content/SKILL.md",
    "skills/data-reports/SKILL.md",
    "skills/personalized-outreach/SKILL.md"
  ]
}
```

**Step 9: Create HEARTBEAT.md**

```markdown
# HEARTBEAT — lucid-video

## Status
- Version: 1.0.0
- Last updated: 2026-02-25
- Status: Active

## Changelog
- 1.0.0 — Initial release: 5 MCP tools, VideoBrief schema, hybrid rendering
```

**Step 10: Commit**

```bash
git add skills/lucid-video/
git commit -m "feat(lucid-video): scaffold plugin structure"
```

---

## Task 2: Core Types and Plugin Identity

**Files:**
- Create: `skills/lucid-video/src/core/plugin-id.ts`
- Create: `skills/lucid-video/src/core/types/index.ts`
- Create: `skills/lucid-video/src/core/types/video-brief.ts`
- Create: `skills/lucid-video/src/core/types/templates.ts`
- Create: `skills/lucid-video/src/core/types/renders.ts`
- Create: `skills/lucid-video/src/core/tools/types.ts`
- Create: `skills/lucid-video/test/setup.ts`
- Test: `skills/lucid-video/test/core/types/video-brief.test.ts`

**Step 1: Write the failing test for VideoBrief validation**

```typescript
// test/core/types/video-brief.test.ts
import { describe, it, expect } from 'vitest';
import { parseVideoBrief } from '../../../src/core/types/video-brief.js';

describe('VideoBrief', () => {
  it('parses a valid full brief', () => {
    const brief = {
      template_id: 'social-clip-v1',
      scenes: [
        { type: 'title', duration: 3, props: { text: 'Hello World' } },
        { type: 'cta', duration: 2, props: { text: 'Follow us', url: 'https://example.com' } },
      ],
      brand: {
        colors: { primary: '#000', secondary: '#fff', background: '#f0f0f0' },
      },
      output: { format: 'mp4', resolution: '1080p' },
    };
    const result = parseVideoBrief(brief);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.template_id).toBe('social-clip-v1');
      expect(result.data.scenes).toHaveLength(2);
    }
  });

  it('parses a minimal brief (only required fields)', () => {
    const brief = {
      template_id: 'metrics-weekly-v1',
      scenes: [{ type: 'title', duration: 5, props: {} }],
      output: { format: 'mp4', resolution: '720p' },
    };
    const result = parseVideoBrief(brief);
    expect(result.success).toBe(true);
  });

  it('rejects brief with missing template_id', () => {
    const brief = {
      scenes: [{ type: 'title', duration: 3, props: {} }],
      output: { format: 'mp4', resolution: '1080p' },
    };
    const result = parseVideoBrief(brief);
    expect(result.success).toBe(false);
  });

  it('rejects brief with empty scenes', () => {
    const brief = {
      template_id: 'test',
      scenes: [],
      output: { format: 'mp4', resolution: '1080p' },
    };
    const result = parseVideoBrief(brief);
    expect(result.success).toBe(false);
  });

  it('rejects brief with invalid scene type', () => {
    const brief = {
      template_id: 'test',
      scenes: [{ type: 'invalid', duration: 3, props: {} }],
      output: { format: 'mp4', resolution: '1080p' },
    };
    const result = parseVideoBrief(brief);
    expect(result.success).toBe(false);
  });

  it('rejects brief with invalid output format', () => {
    const brief = {
      template_id: 'test',
      scenes: [{ type: 'title', duration: 3, props: {} }],
      output: { format: 'avi', resolution: '1080p' },
    };
    const result = parseVideoBrief(brief);
    expect(result.success).toBe(false);
  });

  it('accepts all valid priority values', () => {
    for (const priority of ['burst', 'standard']) {
      const brief = {
        template_id: 'test',
        scenes: [{ type: 'title', duration: 3, props: {} }],
        output: { format: 'mp4', resolution: '1080p' },
        priority,
      };
      const result = parseVideoBrief(brief);
      expect(result.success).toBe(true);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd skills/lucid-video && npx vitest run test/core/types/video-brief.test.ts`
Expected: FAIL — module not found

**Step 3: Create plugin-id.ts**

```typescript
// src/core/plugin-id.ts
export const PLUGIN_ID = 'lucid-video';
export const PLUGIN_NAME = 'Lucid Video';
export const PLUGIN_VERSION = '1.0.0';
```

**Step 4: Create tool types (matching veille pattern)**

```typescript
// src/core/tools/types.ts
export type ParamType = 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';

export interface ToolParamDef {
  type: ParamType;
  required?: boolean;
  description?: string;
  values?: string[];
  min?: number;
  max?: number;
  default?: unknown;
  properties?: Record<string, ToolParamDef>;
  items?: ToolParamDef;
}

export interface ToolDefinition<T = any> {
  name: string;
  description: string;
  params: Record<string, ToolParamDef>;
  execute: (params: T) => Promise<string>;
}
```

**Step 5: Create video-brief.ts with Zod schemas**

```typescript
// src/core/types/video-brief.ts
import { z } from 'zod';

export const SceneTypeSchema = z.enum([
  'title',
  'data-chart',
  'text-overlay',
  'image-showcase',
  'transition',
  'cta',
]);

export const SceneSchema = z.object({
  type: SceneTypeSchema,
  duration: z.number().positive(),
  props: z.record(z.string(), z.unknown()),
});

export const BrandSchema = z.object({
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    background: z.string(),
  }),
  fonts: z.object({
    heading: z.string(),
    body: z.string(),
  }).optional(),
  logo_url: z.string().url().optional(),
  watermark: z.boolean().optional(),
});

export const AudioSchema = z.object({
  background_track: z.string().optional(),
  voiceover_text: z.string().optional(),
  volume: z.number().min(0).max(1).optional(),
});

export const OutputSchema = z.object({
  format: z.enum(['mp4', 'webm', 'gif']),
  resolution: z.enum(['1080p', '720p', 'square', 'story', 'reel']),
  duration_hint: z.number().positive().optional(),
  fps: z.enum(['30', '60']).transform(Number).or(z.literal(30)).or(z.literal(60)).optional(),
});

export const VideoBriefSchema = z.object({
  template_id: z.string().min(1),
  scenes: z.array(SceneSchema).min(1),
  brand: BrandSchema.optional(),
  audio: AudioSchema.optional(),
  output: OutputSchema,
  data_bindings: z.record(z.string(), z.unknown()).optional(),
  priority: z.enum(['burst', 'standard']).optional(),
});

export type VideoBrief = z.infer<typeof VideoBriefSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type SceneType = z.infer<typeof SceneTypeSchema>;
export type Brand = z.infer<typeof BrandSchema>;
export type Audio = z.infer<typeof AudioSchema>;
export type Output = z.infer<typeof OutputSchema>;

export function parseVideoBrief(data: unknown) {
  return VideoBriefSchema.safeParse(data);
}
```

**Step 6: Create templates.ts**

```typescript
// src/core/types/templates.ts
export interface Template {
  id: string;
  name: string;
  category: 'marketing' | 'data-report' | 'outreach' | 'product' | 'internal';
  description: string;
  composition_path: string;
  schema_json: Record<string, unknown>;
  thumbnail_url: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

export interface TemplateListItem {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail_url: string | null;
  scene_types: string[];
}
```

**Step 7: Create renders.ts**

```typescript
// src/core/types/renders.ts
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
```

**Step 8: Create types barrel**

```typescript
// src/core/types/index.ts
export * from './video-brief.js';
export * from './templates.js';
export * from './renders.js';
```

**Step 9: Create test setup**

```typescript
// test/setup.ts
import { vi } from 'vitest';

// Mock fetch globally for engine API calls
vi.stubGlobal('fetch', vi.fn());
```

**Step 10: Run tests to verify they pass**

Run: `cd skills/lucid-video && npx vitest run test/core/types/video-brief.test.ts`
Expected: ALL PASS

**Step 11: Commit**

```bash
git add skills/lucid-video/src/core/ skills/lucid-video/test/
git commit -m "feat(lucid-video): add core types, VideoBrief schema with validation"
```

---

## Task 3: Config and Logger

**Files:**
- Create: `skills/lucid-video/src/core/config/schema.ts`
- Create: `skills/lucid-video/src/core/config/index.ts`
- Create: `skills/lucid-video/src/core/utils/logger.ts`

**Step 1: Create config schema**

```typescript
// src/core/config/schema.ts
export interface VideoPluginConfig {
  engineUrl: string;
  engineApiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  tenantId: string;
  defaultPriority: 'burst' | 'standard';
  defaultFormat: 'mp4' | 'webm' | 'gif';
  defaultResolution: '1080p' | '720p' | 'square' | 'story' | 'reel';
}
```

**Step 2: Create config loader**

```typescript
// src/core/config/index.ts
import type { VideoPluginConfig } from './schema.js';

export type { VideoPluginConfig };

export function loadConfig(env: Record<string, string | undefined> = {}): VideoPluginConfig {
  return {
    engineUrl: env.VIDEO_ENGINE_URL ?? 'http://localhost:4030',
    engineApiKey: env.VIDEO_ENGINE_API_KEY,
    supabaseUrl: env.VIDEO_SUPABASE_URL,
    supabaseKey: env.VIDEO_SUPABASE_KEY,
    tenantId: env.VIDEO_TENANT_ID ?? 'default',
    defaultPriority: (env.VIDEO_DEFAULT_PRIORITY as 'burst' | 'standard') ?? 'standard',
    defaultFormat: (env.VIDEO_DEFAULT_FORMAT as 'mp4' | 'webm' | 'gif') ?? 'mp4',
    defaultResolution: (env.VIDEO_DEFAULT_RESOLUTION as '1080p' | '720p') ?? '1080p',
  };
}
```

**Step 3: Create logger**

```typescript
// src/core/utils/logger.ts
const PREFIX = '[lucid-video]';

export const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, ...args),
  debug: (...args: unknown[]) => {
    if (process.env.DEBUG) console.debug(PREFIX, ...args);
  },
};
```

**Step 4: Commit**

```bash
git add skills/lucid-video/src/core/config/ skills/lucid-video/src/core/utils/
git commit -m "feat(lucid-video): add config loader and logger"
```

---

## Task 4: Engine Client (HTTP calls to rendering engine)

**Files:**
- Create: `skills/lucid-video/src/core/engine/client.ts`
- Create: `skills/lucid-video/src/core/engine/index.ts`
- Test: `skills/lucid-video/test/core/engine/client.test.ts`

**Step 1: Write the failing test**

```typescript
// test/core/engine/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EngineClient } from '../../../src/core/engine/client.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('EngineClient', () => {
  let client: EngineClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new EngineClient({ engineUrl: 'http://localhost:4030' });
  });

  it('render() posts brief and returns render response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ render_id: 'r_123', estimated_seconds: 120, status: 'queued' }),
    });

    const result = await client.render({
      template_id: 'social-clip-v1',
      scenes: [{ type: 'title', duration: 3, props: { text: 'Hi' } }],
      output: { format: 'mp4', resolution: '1080p' },
    });

    expect(result.render_id).toBe('r_123');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4030/render',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('getStatus() returns render status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'rendering', progress_pct: 45 }),
    });

    const result = await client.getStatus('r_123');
    expect(result.status).toBe('rendering');
    expect(result.progress_pct).toBe(45);
  });

  it('listTemplates() returns template list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 'social-clip-v1', name: 'Social Clip' }]),
    });

    const result = await client.listTemplates();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('social-clip-v1');
  });

  it('thumbnail() returns thumbnail URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ thumbnail_url: 'https://cdn.example.com/thumb.png' }),
    });

    const result = await client.thumbnail({
      template_id: 'test',
      scenes: [{ type: 'title', duration: 3, props: {} }],
      output: { format: 'mp4', resolution: '1080p' },
    });
    expect(result.thumbnail_url).toBe('https://cdn.example.com/thumb.png');
  });

  it('cancel() returns cancellation status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ cancelled: true }),
    });

    const result = await client.cancel('r_123');
    expect(result.cancelled).toBe(true);
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    await expect(client.render({
      template_id: 'test',
      scenes: [{ type: 'title', duration: 3, props: {} }],
      output: { format: 'mp4', resolution: '1080p' },
    })).rejects.toThrow('Engine API error 500');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd skills/lucid-video && npx vitest run test/core/engine/client.test.ts`
Expected: FAIL

**Step 3: Implement the engine client**

```typescript
// src/core/engine/client.ts
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
```

**Step 4: Create barrel**

```typescript
// src/core/engine/index.ts
export { EngineClient } from './client.js';
export type { EngineClientConfig } from './client.js';
```

**Step 5: Run tests to verify they pass**

Run: `cd skills/lucid-video && npx vitest run test/core/engine/client.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add skills/lucid-video/src/core/engine/ skills/lucid-video/test/core/engine/
git commit -m "feat(lucid-video): add engine HTTP client with tests"
```

---

## Task 5: MCP Tool Implementations

**Files:**
- Create: `skills/lucid-video/src/core/tools/render-video.ts`
- Create: `skills/lucid-video/src/core/tools/list-templates.ts`
- Create: `skills/lucid-video/src/core/tools/get-render-status.ts`
- Create: `skills/lucid-video/src/core/tools/preview-thumbnail.ts`
- Create: `skills/lucid-video/src/core/tools/cancel-render.ts`
- Create: `skills/lucid-video/src/core/tools/index.ts`
- Test: `skills/lucid-video/test/core/tools/render-video.test.ts`
- Test: `skills/lucid-video/test/core/tools/list-templates.test.ts`

**Step 1: Write failing test for render_video tool**

```typescript
// test/core/tools/render-video.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createRenderVideoTool } from '../../../src/core/tools/render-video.js';

const mockEngine = {
  render: vi.fn().mockResolvedValue({ render_id: 'r_abc', estimated_seconds: 120, status: 'queued' }),
  getStatus: vi.fn(),
  listTemplates: vi.fn(),
  thumbnail: vi.fn(),
  cancel: vi.fn(),
};

describe('render_video tool', () => {
  const tool = createRenderVideoTool({ engine: mockEngine as any });

  it('has correct name and description', () => {
    expect(tool.name).toBe('render_video');
    expect(tool.description).toContain('video');
  });

  it('validates and renders a brief', async () => {
    const result = await tool.execute({
      template_id: 'social-clip-v1',
      scenes: JSON.stringify([{ type: 'title', duration: 3, props: { text: 'Hi' } }]),
      format: 'mp4',
      resolution: '1080p',
      priority: 'standard',
    });

    expect(mockEngine.render).toHaveBeenCalled();
    expect(result).toContain('r_abc');
  });

  it('rejects invalid input', async () => {
    const result = await tool.execute({
      template_id: '',
      scenes: '[]',
      format: 'mp4',
      resolution: '1080p',
    });

    expect(result).toContain('Error');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd skills/lucid-video && npx vitest run test/core/tools/render-video.test.ts`
Expected: FAIL

**Step 3: Implement all 5 tools**

```typescript
// src/core/tools/render-video.ts
import type { ToolDefinition } from './types.js';
import type { EngineClient } from '../engine/client.js';
import { parseVideoBrief } from '../types/video-brief.js';

export interface RenderVideoToolDeps {
  engine: EngineClient;
}

export function createRenderVideoTool(deps: RenderVideoToolDeps): ToolDefinition {
  return {
    name: 'render_video',
    description: 'Render a video from a VideoBrief. Provide template_id, scenes (JSON array), output format, and resolution. Returns a render_id to track progress.',
    params: {
      template_id: { type: 'string', required: true, description: 'Template ID (e.g. "social-clip-v1")' },
      scenes: { type: 'string', required: true, description: 'JSON array of scenes: [{type, duration, props}]' },
      format: { type: 'enum', required: true, values: ['mp4', 'webm', 'gif'], description: 'Output format' },
      resolution: { type: 'enum', required: true, values: ['1080p', '720p', 'square', 'story', 'reel'], description: 'Output resolution' },
      priority: { type: 'enum', required: false, values: ['burst', 'standard'], description: 'Rendering priority (burst=Lambda, standard=Railway)' },
      brand_colors: { type: 'string', required: false, description: 'JSON: {primary, secondary, background}' },
      data_bindings: { type: 'string', required: false, description: 'JSON object of data to bind into the template' },
    },
    async execute(params: Record<string, unknown>): Promise<string> {
      try {
        const scenes = JSON.parse(params.scenes as string);
        const brand = params.brand_colors ? { colors: JSON.parse(params.brand_colors as string) } : undefined;
        const dataBindings = params.data_bindings ? JSON.parse(params.data_bindings as string) : undefined;

        const brief = {
          template_id: params.template_id,
          scenes,
          brand,
          output: { format: params.format, resolution: params.resolution },
          data_bindings: dataBindings,
          priority: params.priority,
        };

        const parsed = parseVideoBrief(brief);
        if (!parsed.success) {
          return `Error: Invalid VideoBrief — ${parsed.error.issues.map((i) => i.message).join(', ')}`;
        }

        const result = await deps.engine.render(parsed.data);
        return JSON.stringify(result, null, 2);
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  };
}
```

```typescript
// src/core/tools/list-templates.ts
import type { ToolDefinition } from './types.js';
import type { EngineClient } from '../engine/client.js';

export interface ListTemplatesToolDeps {
  engine: EngineClient;
}

export function createListTemplatesTool(deps: ListTemplatesToolDeps): ToolDefinition {
  return {
    name: 'list_templates',
    description: 'List available video templates. Optionally filter by category.',
    params: {
      category: { type: 'enum', required: false, values: ['marketing', 'data-report', 'outreach', 'product', 'internal'], description: 'Filter by template category' },
    },
    async execute(params: Record<string, unknown>): Promise<string> {
      try {
        const templates = await deps.engine.listTemplates(params.category as string | undefined);
        if (templates.length === 0) return 'No templates found.';
        return JSON.stringify(templates, null, 2);
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  };
}
```

```typescript
// src/core/tools/get-render-status.ts
import type { ToolDefinition } from './types.js';
import type { EngineClient } from '../engine/client.js';

export interface GetRenderStatusToolDeps {
  engine: EngineClient;
}

export function createGetRenderStatusTool(deps: GetRenderStatusToolDeps): ToolDefinition {
  return {
    name: 'get_render_status',
    description: 'Check the status and progress of a video render job. Returns status, progress percentage, and video URL when complete.',
    params: {
      render_id: { type: 'string', required: true, description: 'The render job ID returned by render_video' },
    },
    async execute(params: Record<string, unknown>): Promise<string> {
      try {
        const status = await deps.engine.getStatus(params.render_id as string);
        return JSON.stringify(status, null, 2);
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  };
}
```

```typescript
// src/core/tools/preview-thumbnail.ts
import type { ToolDefinition } from './types.js';
import type { EngineClient } from '../engine/client.js';
import { parseVideoBrief } from '../types/video-brief.js';

export interface PreviewThumbnailToolDeps {
  engine: EngineClient;
}

export function createPreviewThumbnailTool(deps: PreviewThumbnailToolDeps): ToolDefinition {
  return {
    name: 'preview_thumbnail',
    description: 'Generate a thumbnail preview (frame 0) of a video brief without rendering the full video. Fast (<3s). Use to confirm visual before committing to a full render.',
    params: {
      template_id: { type: 'string', required: true, description: 'Template ID' },
      scenes: { type: 'string', required: true, description: 'JSON array of scenes' },
      format: { type: 'enum', required: true, values: ['mp4', 'webm', 'gif'], description: 'Output format' },
      resolution: { type: 'enum', required: true, values: ['1080p', '720p', 'square', 'story', 'reel'], description: 'Output resolution' },
      brand_colors: { type: 'string', required: false, description: 'JSON: {primary, secondary, background}' },
    },
    async execute(params: Record<string, unknown>): Promise<string> {
      try {
        const scenes = JSON.parse(params.scenes as string);
        const brand = params.brand_colors ? { colors: JSON.parse(params.brand_colors as string) } : undefined;

        const brief = {
          template_id: params.template_id,
          scenes,
          brand,
          output: { format: params.format, resolution: params.resolution },
        };

        const parsed = parseVideoBrief(brief);
        if (!parsed.success) {
          return `Error: Invalid brief — ${parsed.error.issues.map((i) => i.message).join(', ')}`;
        }

        const result = await deps.engine.thumbnail(parsed.data);
        return JSON.stringify(result, null, 2);
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  };
}
```

```typescript
// src/core/tools/cancel-render.ts
import type { ToolDefinition } from './types.js';
import type { EngineClient } from '../engine/client.js';

export interface CancelRenderToolDeps {
  engine: EngineClient;
}

export function createCancelRenderTool(deps: CancelRenderToolDeps): ToolDefinition {
  return {
    name: 'cancel_render',
    description: 'Cancel a running video render job.',
    params: {
      render_id: { type: 'string', required: true, description: 'The render job ID to cancel' },
    },
    async execute(params: Record<string, unknown>): Promise<string> {
      try {
        const result = await deps.engine.cancel(params.render_id as string);
        return result.cancelled
          ? `Render ${params.render_id} cancelled successfully.`
          : `Render ${params.render_id} could not be cancelled (may have already completed).`;
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  };
}
```

**Step 4: Create tools barrel**

```typescript
// src/core/tools/index.ts
import type { ToolDefinition } from './types.js';
import type { EngineClient } from '../engine/client.js';
import { createRenderVideoTool } from './render-video.js';
import { createListTemplatesTool } from './list-templates.js';
import { createGetRenderStatusTool } from './get-render-status.js';
import { createPreviewThumbnailTool } from './preview-thumbnail.js';
import { createCancelRenderTool } from './cancel-render.js';

export interface ToolDependencies {
  engine: EngineClient;
}

export function createAllTools(deps: ToolDependencies): ToolDefinition[] {
  return [
    createRenderVideoTool({ engine: deps.engine }),
    createListTemplatesTool({ engine: deps.engine }),
    createGetRenderStatusTool({ engine: deps.engine }),
    createPreviewThumbnailTool({ engine: deps.engine }),
    createCancelRenderTool({ engine: deps.engine }),
  ];
}

export type { ToolDefinition, ToolParamDef } from './types.js';
export { createRenderVideoTool } from './render-video.js';
export { createListTemplatesTool } from './list-templates.js';
export { createGetRenderStatusTool } from './get-render-status.js';
export { createPreviewThumbnailTool } from './preview-thumbnail.js';
export { createCancelRenderTool } from './cancel-render.js';
```

**Step 5: Run all tool tests**

Run: `cd skills/lucid-video && npx vitest run`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add skills/lucid-video/src/core/tools/
git commit -m "feat(lucid-video): add 5 MCP tool implementations"
```

---

## Task 6: Schema Adapters (Zod + TypeBox)

**Files:**
- Create: `skills/lucid-video/src/adapters/zod-schema.ts`
- Create: `skills/lucid-video/src/adapters/typebox-schema.ts`

**Step 1: Create Zod adapter (copy from veille pattern)**

```typescript
// src/adapters/zod-schema.ts
import { z } from 'zod';
import type { ToolParamDef } from '../core/tools/types.js';

function paramToZod(def: ToolParamDef): z.ZodType {
  let schema: z.ZodType;

  switch (def.type) {
    case 'string':
      schema = z.string();
      break;
    case 'number': {
      let num = z.number();
      if (def.min !== undefined) num = num.min(def.min);
      if (def.max !== undefined) num = num.max(def.max);
      schema = num;
      break;
    }
    case 'boolean':
      schema = z.boolean();
      break;
    case 'enum':
      schema = z.enum(def.values as [string, ...string[]]);
      break;
    case 'object':
      if (def.properties) {
        schema = toZodSchema(def.properties);
      } else {
        schema = z.record(z.string(), z.unknown());
      }
      break;
    case 'array':
      schema = z.array(def.items ? paramToZod(def.items) : z.unknown());
      break;
    default:
      schema = z.unknown();
  }

  if (def.description) {
    schema = schema.describe(def.description);
  }

  return schema;
}

export function toZodSchema(params: Record<string, ToolParamDef>): z.ZodObject<any> {
  const shape: Record<string, z.ZodType> = {};
  for (const [key, def] of Object.entries(params)) {
    const fieldSchema = paramToZod(def);
    shape[key] = def.required === false ? fieldSchema.optional() : fieldSchema;
  }
  return z.object(shape);
}
```

**Step 2: Create TypeBox adapter (copy from veille pattern)**

```typescript
// src/adapters/typebox-schema.ts
import { Type, type TSchema } from '@sinclair/typebox';
import type { ToolParamDef } from '../core/tools/types.js';

function paramToTypeBox(def: ToolParamDef): TSchema {
  const opts: Record<string, unknown> = {};
  if (def.description) opts.description = def.description;

  switch (def.type) {
    case 'string':
      return Type.String(opts);
    case 'number': {
      const numOpts = { ...opts } as Record<string, unknown>;
      if (def.min !== undefined) numOpts.minimum = def.min;
      if (def.max !== undefined) numOpts.maximum = def.max;
      return Type.Number(numOpts);
    }
    case 'boolean':
      return Type.Boolean(opts);
    case 'enum':
      return Type.Union(
        (def.values ?? []).map((v) => Type.Literal(v)),
        opts,
      );
    case 'object':
      if (def.properties) {
        return toTypeBoxSchema(def.properties);
      }
      return Type.Record(Type.String(), Type.Unknown(), opts);
    case 'array':
      return Type.Array(def.items ? paramToTypeBox(def.items) : Type.Unknown(), opts);
    default:
      return Type.Unknown(opts);
  }
}

export function toTypeBoxSchema(params: Record<string, ToolParamDef>): TSchema {
  const props: Record<string, TSchema> = {};
  const required: string[] = [];

  for (const [key, def] of Object.entries(params)) {
    props[key] = paramToTypeBox(def);
    if (def.required !== false) required.push(key);
  }

  return Type.Object(props, { required });
}
```

**Step 3: Commit**

```bash
git add skills/lucid-video/src/adapters/
git commit -m "feat(lucid-video): add Zod and TypeBox schema adapters"
```

---

## Task 7: MCP Server, OpenClaw Adapter, CLI Entry Point

**Files:**
- Create: `skills/lucid-video/src/mcp.ts`
- Create: `skills/lucid-video/src/openclaw.ts`
- Create: `skills/lucid-video/src/bin.ts`
- Create: `skills/lucid-video/src/index.ts`
- Create: `skills/lucid-video/src/core/index.ts`

**Step 1: Create MCP server (following veille pattern)**

```typescript
// src/mcp.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from './core/config/index.js';
import { EngineClient } from './core/engine/client.js';
import { createAllTools } from './core/tools/index.js';
import { toZodSchema } from './adapters/zod-schema.js';
import { log } from './core/utils/logger.js';
import { PLUGIN_NAME, PLUGIN_VERSION } from './core/plugin-id.js';

export function createVideoServer(env: Record<string, string | undefined> = process.env) {
  const server = new McpServer({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
  });

  const config = loadConfig(env);
  const engine = new EngineClient({
    engineUrl: config.engineUrl,
    engineApiKey: config.engineApiKey,
  });

  const tools = createAllTools({ engine });

  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      toZodSchema(tool.params).shape,
      async (params: Record<string, unknown>) => {
        const result = await tool.execute(params);
        return { content: [{ type: 'text' as const, text: result }] };
      },
    );
  }

  log.info(`${PLUGIN_NAME} MCP server created with ${tools.length} tools`);
  return server;
}
```

**Step 2: Create OpenClaw adapter**

```typescript
// src/openclaw.ts
import { loadConfig } from './core/config/index.js';
import { EngineClient } from './core/engine/client.js';
import { createAllTools } from './core/tools/index.js';
import { toTypeBoxSchema } from './adapters/typebox-schema.js';
import { log } from './core/utils/logger.js';
import { PLUGIN_NAME } from './core/plugin-id.js';

export default function register(api: any): void {
  log.info(`Registering ${PLUGIN_NAME} plugin...`);

  const rawConfig = api.config ?? {};
  const config = loadConfig(rawConfig);

  const engine = new EngineClient({
    engineUrl: config.engineUrl,
    engineApiKey: config.engineApiKey,
  });

  const tools = createAllTools({ engine });

  for (const tool of tools) {
    api.registerTool(tool.name, {
      description: tool.description,
      parameters: toTypeBoxSchema(tool.params),
      execute: tool.execute,
    });
  }

  log.info(`${PLUGIN_NAME} plugin registered with ${tools.length} tools`);
}
```

**Step 3: Create CLI entry point**

```typescript
// src/bin.ts
#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createVideoServer } from './mcp.js';

const server = createVideoServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Step 4: Create barrel exports**

```typescript
// src/index.ts
export { default } from './openclaw.js';
```

```typescript
// src/core/index.ts
export * from './types/index.js';
export * from './engine/index.js';
export * from './tools/index.js';
export * from './config/index.js';
export { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION } from './plugin-id.js';
```

**Step 5: Run full test suite + build**

Run: `cd skills/lucid-video && npx vitest run && npx tsup`
Expected: ALL PASS, build outputs to dist/

**Step 6: Commit**

```bash
git add skills/lucid-video/src/
git commit -m "feat(lucid-video): add MCP server, OpenClaw adapter, CLI entry point"
```

---

## Task 8: Domain Knowledge (AgentSkills Markdown)

**Files:**
- Create: `skills/lucid-video/skills/social-content/SKILL.md`
- Create: `skills/lucid-video/skills/social-content/references/platform-specs.md`
- Create: `skills/lucid-video/skills/social-content/references/hook-formulas.md`
- Create: `skills/lucid-video/skills/data-reports/SKILL.md`
- Create: `skills/lucid-video/skills/data-reports/references/chart-animation.md`
- Create: `skills/lucid-video/skills/personalized-outreach/SKILL.md`
- Create: `skills/lucid-video/skills/personalized-outreach/references/personalization-strategies.md`

**Step 1: Create social-content SKILL.md**

```markdown
---
name: social-content
description: Generate short-form video content optimized for social media platforms
version: 1.0.0
---

# Social Content Video Generation

## When to Use
- Creating short-form video for Instagram Reels, TikTok, YouTube Shorts, LinkedIn
- Product launches, feature announcements, testimonial reels
- Ad creatives and promotional clips

## Template: social-clip-v1

### Scene Structure
1. **Hook** (2-3s): Bold text overlay with attention-grabbing statement
2. **Problem** (3-5s): Relatable pain point with visual metaphor
3. **Solution** (5-8s): Product showcase with key benefit callouts
4. **Social Proof** (3-5s): Metrics, logos, or testimonial quote
5. **CTA** (2-3s): Clear call-to-action with branding

### Best Practices
- Lead with the hook — first 2 seconds determine retention
- Match resolution to platform: `reel` for Instagram/TikTok, `square` for feeds, `1080p` for YouTube
- Use brand colors consistently across all scenes
- Keep total duration under 30s for Reels/TikTok, under 60s for YouTube Shorts
- Include captions — 85% of social video is watched without sound

### Data Bindings
- `headline`: Primary hook text
- `product_name`: Product/feature being promoted
- `key_benefits`: Array of 3 benefit strings
- `metrics`: Object with social proof numbers
- `cta_text`: Call-to-action text
- `cta_url`: Destination URL
```

**Step 2: Create platform-specs.md reference**

```markdown
# Platform Video Specifications

## Instagram Reels
- Resolution: 1080x1920 (9:16) → use `reel`
- Duration: 15s, 30s, 60s, 90s
- Format: MP4 (H.264)
- Max file size: 250MB

## TikTok
- Resolution: 1080x1920 (9:16) → use `reel`
- Duration: 15s to 10min
- Format: MP4
- Max file size: 287.6MB

## YouTube Shorts
- Resolution: 1080x1920 (9:16) → use `reel`
- Duration: up to 60s
- Format: MP4
- Max file size: 256GB (standard upload limit)

## LinkedIn Video
- Resolution: 1920x1080 (16:9) → use `1080p`
- Duration: 3s to 10min
- Format: MP4
- Max file size: 5GB

## Twitter/X
- Resolution: 1280x720 minimum → use `720p` or `1080p`
- Duration: 0.5s to 2min 20s
- Format: MP4
- Max file size: 512MB

## Facebook Feed
- Resolution: 1080x1080 (1:1) → use `square`
- Duration: 1s to 240min
- Format: MP4
- Max file size: 4GB
```

**Step 3: Create hook-formulas.md reference**

```markdown
# Video Hook Formulas

Proven attention-grabbing patterns for the first 2-3 seconds:

## Formula 1: Bold Claim
"[Product] helped [audience] achieve [result] in [timeframe]"
Example: "Lucid helped 500 startups automate their analytics in under a week"

## Formula 2: Question Hook
"What if you could [desirable outcome] without [pain point]?"
Example: "What if you could close 3x more deals without cold calling?"

## Formula 3: Contrarian
"Stop [common practice]. Here's what works instead."
Example: "Stop writing blog posts. Here's what actually drives traffic."

## Formula 4: Number Hook
"[Number] [things] every [audience] needs to know about [topic]"
Example: "3 things every founder needs to know about AI agents"

## Formula 5: Before/After
"Before: [pain]. After: [transformation]."
Example: "Before: 6 hours on reports. After: 6 minutes with Lucid."
```

**Step 4: Create data-reports SKILL.md**

```markdown
---
name: data-reports
description: Generate animated data report videos from KPIs, charts, and analytics
version: 1.0.0
---

# Data Report Video Generation

## When to Use
- Weekly/monthly KPI video summaries for Slack or email
- Investor update videos with growth metrics
- Team standup summaries with visual data

## Template: metrics-weekly-v1

### Scene Structure
1. **Title** (3s): Report name, date range, company logo
2. **KPI Overview** (5s): Animated counter for 3-4 key metrics with delta arrows
3. **Chart Deep-Dive** (8s per chart): Animated line/bar chart with annotations
4. **Comparison** (5s): Period-over-period comparison with percentage changes
5. **Highlights** (5s): Top 3 achievements or concerns
6. **CTA** (3s): "View full dashboard" or next steps

### Data Bindings
- `report_title`: String
- `date_range`: { start: string, end: string }
- `kpis`: Array of { label, value, delta_pct, trend: 'up'|'down'|'flat' }
- `charts`: Array of { type: 'line'|'bar'|'pie', title, data_points: number[] }
- `highlights`: Array of strings (max 3)

### Best Practices
- Use `1080p` for presentations, `square` for Slack
- Animate numbers counting up for engagement
- Color-code deltas: green for positive, red for negative
- Keep chart animations sequential, not simultaneous
```

**Step 5: Create personalized-outreach SKILL.md**

```markdown
---
name: personalized-outreach
description: Generate 1:1 personalized video for sales prospecting and customer success
version: 1.0.0
---

# Personalized Outreach Video Generation

## When to Use
- Sales prospecting — send personalized video to leads
- Customer onboarding — welcome video with account-specific details
- Customer success — renewal/upsell with usage highlights

## Template: personalized-outreach-v1

### Scene Structure
1. **Personalized Greeting** (3s): "Hi [First Name]" with their company logo
2. **Context** (5s): Reference to their specific pain point or recent activity
3. **Solution** (8s): How your product solves their specific problem
4. **Social Proof** (4s): Case study from similar company/industry
5. **CTA** (3s): "Book a call" or specific next step

### Data Bindings
- `prospect_name`: String (first name)
- `company_name`: String
- `company_logo_url`: URL (optional)
- `pain_point`: String (specific to prospect)
- `solution_pitch`: String (tailored value prop)
- `case_study`: { company, result, metric }
- `cta_text`: String
- `cta_url`: String (calendar link, demo link, etc.)

### Personalization Rules
- Always use first name, never full name
- If company logo unavailable, use company name as text
- Match industry vertical in social proof scene
- Keep under 30 seconds — shorter is better for cold outreach
- A/B test: direct CTA vs. soft CTA ("interested?" vs. "book now")
```

**Step 6: Commit**

```bash
git add skills/lucid-video/skills/
git commit -m "feat(lucid-video): add domain knowledge for 3 sub-skills"
```

---

## Task 9: Plugin Documentation

**Files:**
- Create: `skills/lucid-video/README.md`
- Create: `skills/lucid-video/docs/getting-started.md`
- Create: `skills/lucid-video/docs/video-brief-reference.md`
- Create: `skills/lucid-video/docs/templates.md`
- Create: `skills/lucid-video/docs/cross-plugin-integration.md`

**Step 1: Create README.md**

```markdown
# lucid-video

Agent-native video generation using [Remotion](https://remotion.dev). Generate marketing content, data reports, and personalized outreach videos through AI agents via MCP tools.

## Features

- **5 MCP tools**: `render_video`, `list_templates`, `get_render_status`, `preview_thumbnail`, `cancel_render`
- **VideoBrief protocol**: Standardized schema for cross-plugin video generation
- **Hybrid rendering**: Lambda (burst, ~2min) + Railway (standard, ~5min)
- **3 skill domains**: Social content, data reports, personalized outreach
- **Dual adapter**: MCP (Claude Code) + OpenClaw

## Quick Start

### As MCP Server (Claude Code)

```json
{
  "mcpServers": {
    "lucid-video": {
      "command": "npx",
      "args": ["@raijinlabs/video"],
      "env": {
        "VIDEO_ENGINE_URL": "https://your-engine.railway.app",
        "VIDEO_ENGINE_API_KEY": "your-key"
      }
    }
  }
}
```

### As OpenClaw Plugin

```bash
npm install @raijinlabs/video
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `render_video` | Submit a VideoBrief for rendering. Returns render_id for tracking. |
| `list_templates` | Browse available templates, optionally filtered by category. |
| `get_render_status` | Poll render progress. Returns status, progress %, and video URL when done. |
| `preview_thumbnail` | Render frame 0 only (<3s) to preview before full render. |
| `cancel_render` | Cancel a running render job. |

## VideoBrief Schema

```typescript
{
  template_id: string;        // Which template to use
  scenes: Scene[];            // Ordered scenes with type, duration, props
  brand?: Brand;              // Colors, fonts, logo
  audio?: Audio;              // Background track, voiceover
  output: Output;             // Format, resolution, fps
  data_bindings?: object;     // Data from other plugins
  priority?: 'burst' | 'standard';
}
```

See [VideoBrief Reference](docs/video-brief-reference.md) for full schema docs.

## Cross-Plugin Integration

Other Lucid plugins can generate videos by emitting a VideoBrief:

| Plugin | Use Case | Brief Type |
|--------|----------|-----------|
| lucid-metrics | Weekly KPI video | metrics-weekly-v1 |
| lucid-prospect | Personalized sales video | personalized-outreach-v1 |
| lucid-hype | Social content clips | social-clip-v1 |
| lucid-veille | News digest video | news-digest-v1 |
| lucid-compete | Competitor update video | competitor-update-v1 |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VIDEO_ENGINE_URL` | Yes | URL of the Remotion rendering engine |
| `VIDEO_ENGINE_API_KEY` | No | API key for engine authentication |
| `VIDEO_SUPABASE_URL` | No | Supabase URL for template/render storage |
| `VIDEO_SUPABASE_KEY` | No | Supabase service key |
| `VIDEO_TENANT_ID` | No | Tenant ID (default: "default") |
| `VIDEO_DEFAULT_PRIORITY` | No | Default render priority (default: "standard") |

## Architecture

```
Agent → MCP Tool → Engine Client → Rendering Engine (Railway)
                                     ├── Lambda (burst renders)
                                     └── Local (standard renders)
```

## License

MIT
```

**Step 2: Create getting-started.md**

```markdown
# Getting Started with lucid-video

## Prerequisites

- Node.js >= 18
- A running Remotion rendering engine (see [Rendering Engine Setup](#rendering-engine))
- (Optional) Supabase project for template/render persistence

## Installation

```bash
# In the lucid-plugins monorepo
cd skills/lucid-video
npm install

# Standalone
npm install @raijinlabs/video
```

## Running the MCP Server

```bash
# Direct
VIDEO_ENGINE_URL=http://localhost:4030 npx @raijinlabs/video

# With Claude Code config
# Add to .claude/mcp.json — see README
```

## Your First Render

Once the MCP server is running, an AI agent can:

1. **List available templates:**
   ```
   list_templates(category: "marketing")
   ```

2. **Preview before rendering:**
   ```
   preview_thumbnail(
     template_id: "social-clip-v1",
     scenes: '[{"type":"title","duration":3,"props":{"text":"Launch Day!"}}]',
     format: "mp4",
     resolution: "reel"
   )
   ```

3. **Render the video:**
   ```
   render_video(
     template_id: "social-clip-v1",
     scenes: '[...]',
     format: "mp4",
     resolution: "reel",
     priority: "burst"
   )
   ```

4. **Check progress:**
   ```
   get_render_status(render_id: "r_abc123")
   ```

## Rendering Engine

The plugin does NOT include Remotion rendering — it calls a rendering engine API over HTTP. You need to deploy a rendering engine separately. The engine is a Fastify service on Railway that runs Remotion's bundler and renderer.

See the design doc at `docs/plans/2026-02-25-lucid-video-design.md` for the rendering engine specification.

## Development

```bash
npm run build        # Build with tsup
npm run test         # Run tests with vitest
npm run typecheck    # TypeScript check
npm run lint         # Prettier check
```
```

**Step 3: Create video-brief-reference.md**

```markdown
# VideoBrief Reference

The `VideoBrief` is the core data structure that describes a video to render. It's a JSON object that any system or plugin can construct.

## Full Schema

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `template_id` | string | Yes | Template identifier (e.g., "social-clip-v1") |
| `scenes` | Scene[] | Yes | Ordered array of scenes (min 1) |
| `brand` | Brand | No | Branding configuration |
| `audio` | Audio | No | Audio configuration |
| `output` | Output | Yes | Output format settings |
| `data_bindings` | object | No | Arbitrary data for template interpolation |
| `priority` | "burst" \| "standard" | No | Rendering priority |

### Scene

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | SceneType | Yes | Scene type |
| `duration` | number | Yes | Duration in seconds (must be > 0) |
| `props` | object | Yes | Template-specific properties |

### SceneType

One of: `title`, `data-chart`, `text-overlay`, `image-showcase`, `transition`, `cta`

### Brand

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `colors.primary` | string | Yes | Primary brand color (hex) |
| `colors.secondary` | string | Yes | Secondary brand color (hex) |
| `colors.background` | string | Yes | Background color (hex) |
| `fonts.heading` | string | No | Heading font family |
| `fonts.body` | string | No | Body font family |
| `logo_url` | string (URL) | No | Brand logo URL |
| `watermark` | boolean | No | Add watermark |

### Audio

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background_track` | string | No | Track name or URL |
| `voiceover_text` | string | No | Text for TTS voiceover |
| `volume` | number (0-1) | No | Audio volume |

### Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | "mp4" \| "webm" \| "gif" | Yes | Output format |
| `resolution` | "1080p" \| "720p" \| "square" \| "story" \| "reel" | Yes | Output resolution |
| `duration_hint` | number | No | Suggested total duration (seconds) |
| `fps` | 30 \| 60 | No | Frames per second |

## Resolution Mapping

| Resolution | Dimensions | Use Case |
|-----------|-----------|----------|
| `1080p` | 1920x1080 | YouTube, LinkedIn, presentations |
| `720p` | 1280x720 | Email, general purpose |
| `square` | 1080x1080 | Instagram feed, Facebook |
| `story` | 1080x1920 | Instagram/Facebook Stories |
| `reel` | 1080x1920 | Instagram Reels, TikTok, YouTube Shorts |

## Examples

### Minimal Brief

```json
{
  "template_id": "social-clip-v1",
  "scenes": [
    { "type": "title", "duration": 5, "props": { "text": "Hello World" } }
  ],
  "output": { "format": "mp4", "resolution": "1080p" }
}
```

### Full Brief

```json
{
  "template_id": "metrics-weekly-v1",
  "scenes": [
    { "type": "title", "duration": 3, "props": { "text": "Weekly Report", "subtitle": "Jan 20-26" } },
    { "type": "data-chart", "duration": 8, "props": { "chart_type": "line", "title": "Revenue" } },
    { "type": "data-chart", "duration": 8, "props": { "chart_type": "bar", "title": "Signups" } },
    { "type": "cta", "duration": 3, "props": { "text": "View Dashboard", "url": "https://app.lucid.dev" } }
  ],
  "brand": {
    "colors": { "primary": "#6366F1", "secondary": "#8B5CF6", "background": "#0F172A" },
    "fonts": { "heading": "Inter", "body": "Inter" },
    "logo_url": "https://cdn.lucid.dev/logo.svg"
  },
  "audio": { "background_track": "corporate", "volume": 0.3 },
  "output": { "format": "mp4", "resolution": "1080p", "fps": 30 },
  "data_bindings": {
    "kpis": [
      { "label": "Revenue", "value": 125000, "delta_pct": 12.5, "trend": "up" },
      { "label": "Users", "value": 4520, "delta_pct": 8.3, "trend": "up" }
    ]
  },
  "priority": "standard"
}
```
```

**Step 4: Create templates.md**

```markdown
# Video Templates

Templates are pre-built Remotion compositions that define the visual structure of a video. Agents select a template and fill it with data via the VideoBrief.

## Starter Templates

### metrics-weekly-v1
- **Category:** data-report
- **Use case:** Weekly KPI summary videos for Slack/email
- **Scenes:** Title → KPI counters → Charts → Period comparison → Highlights → CTA
- **Resolution:** 1080p (presentations), square (Slack)

### social-clip-v1
- **Category:** marketing
- **Use case:** Short-form social content (Reels, TikTok, Shorts)
- **Scenes:** Hook → Problem → Solution → Social proof → CTA
- **Resolution:** reel (9:16)

### personalized-outreach-v1
- **Category:** outreach
- **Use case:** 1:1 personalized sales prospecting videos
- **Scenes:** Greeting → Context → Solution → Social proof → CTA
- **Resolution:** 1080p

### changelog-v1
- **Category:** product
- **Use case:** Release notes as video
- **Scenes:** Version title → Feature demos → Upgrade CTA
- **Resolution:** 1080p

### team-update-v1
- **Category:** internal
- **Use case:** Weekly standup summary
- **Scenes:** Title → Highlights → Blockers → Next week
- **Resolution:** 1080p or square
```

**Step 5: Create cross-plugin-integration.md**

```markdown
# Cross-Plugin Integration

lucid-video's power comes from its integration with other Lucid plugins. Any plugin can emit a `VideoBrief` to generate video with context-aware data.

## How It Works

1. Plugin A (e.g., lucid-metrics) gathers data
2. Plugin A constructs a VideoBrief with `data_bindings`
3. Agent calls `render_video` from lucid-video with the brief
4. Rendering engine processes the brief and returns a video URL

## Integration Examples

### lucid-metrics → Weekly Report Video

```
Agent workflow:
1. Call lucid-metrics to get weekly KPIs
2. Construct VideoBrief:
   - template_id: "metrics-weekly-v1"
   - data_bindings: { kpis: [...], charts: [...] }
3. Call render_video with the brief
4. Share video URL in Slack
```

### lucid-prospect → Personalized Sales Video

```
Agent workflow:
1. Call lucid-prospect to get lead details
2. Construct VideoBrief:
   - template_id: "personalized-outreach-v1"
   - data_bindings: { prospect_name, company_name, pain_point }
3. Call preview_thumbnail to verify
4. Call render_video with priority: "burst"
5. Send video via email sequence
```

### lucid-hype → Social Content

```
Agent workflow:
1. Call lucid-hype to get campaign brief
2. Construct VideoBrief:
   - template_id: "social-clip-v1"
   - data_bindings: { headline, key_benefits, cta_text }
   - output.resolution: "reel"
3. Call render_video
4. Publish via lucid-veille auto-publishing
```

## Building Your Own Integration

Any plugin can integrate by:

1. Importing the VideoBrief types: `import type { VideoBrief } from '@raijinlabs/video/core'`
2. Constructing a brief with the appropriate template_id and data_bindings
3. Calling the render_video MCP tool or using the EngineClient directly
```

**Step 6: Commit**

```bash
git add skills/lucid-video/README.md skills/lucid-video/docs/
git commit -m "docs(lucid-video): add README, getting started, brief reference, templates, and integration guides"
```

---

## Task 10: Validate and Final Check

**Step 1: Run monorepo validation**

Run: `cd /c/lucid-plugins && bash scripts/validate-all.sh`
Expected: lucid-video passes all checks

**Step 2: Run plugin tests**

Run: `cd /c/lucid-plugins/skills/lucid-video && npm install && npx vitest run`
Expected: ALL PASS

**Step 3: Run build**

Run: `cd /c/lucid-plugins/skills/lucid-video && npx tsup`
Expected: Clean build, all entry points in dist/

**Step 4: Run typecheck**

Run: `cd /c/lucid-plugins/skills/lucid-video && npx tsc --noEmit`
Expected: No errors

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(lucid-video): complete plugin v1.0.0 — 5 MCP tools, VideoBrief schema, docs"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Scaffold plugin structure | 9 config files |
| 2 | Core types + VideoBrief schema | 7 source + 1 test |
| 3 | Config and logger | 3 source |
| 4 | Engine HTTP client | 2 source + 1 test |
| 5 | 5 MCP tool implementations | 6 source + 2 tests |
| 6 | Schema adapters (Zod + TypeBox) | 2 source |
| 7 | MCP server, OpenClaw, CLI, barrels | 5 source |
| 8 | Domain knowledge (3 sub-skills) | 7 markdown |
| 9 | Plugin documentation | 5 markdown |
| 10 | Validation + final check | — |

**Total: ~47 files, 10 tasks**
