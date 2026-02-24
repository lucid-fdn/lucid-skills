# Cross-Plugin Integration

lucid-video's power comes from its integration with other Lucid plugins. Any plugin can emit a `VideoBrief` to generate video with context-aware data.

## How It Works

1. Plugin A (e.g., lucid-metrics) gathers data
2. Plugin A constructs a VideoBrief with `data_bindings`
3. Agent calls `render_video` from lucid-video with the brief
4. Rendering engine processes the brief and returns a video URL

## Integration Examples

### lucid-metrics -> Weekly Report Video

```
Agent workflow:
1. Call lucid-metrics to get weekly KPIs
2. Construct VideoBrief:
   - template_id: "metrics-weekly-v1"
   - data_bindings: { kpis: [...], charts: [...] }
3. Call render_video with the brief
4. Share video URL in Slack
```

### lucid-prospect -> Personalized Sales Video

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

### lucid-hype -> Social Content

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
