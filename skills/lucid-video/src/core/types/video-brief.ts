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
  fps: z.union([z.literal(30), z.literal(60)]).optional(),
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
