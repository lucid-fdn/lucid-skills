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
