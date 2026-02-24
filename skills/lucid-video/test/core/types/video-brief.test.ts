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
