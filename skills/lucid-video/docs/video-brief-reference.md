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
