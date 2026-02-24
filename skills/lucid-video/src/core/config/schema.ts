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
