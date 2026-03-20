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
