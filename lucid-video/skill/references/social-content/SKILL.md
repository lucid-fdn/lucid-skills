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
