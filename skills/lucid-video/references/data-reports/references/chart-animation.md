# Chart Animation Best Practices

## Line Charts
- Draw line progressively left-to-right (1-2s)
- Highlight peaks/troughs with dot + label after line completes
- Use gradient fill below the line for area effect

## Bar Charts
- Grow bars from bottom simultaneously (0.5s stagger)
- Add value labels above bars after growth completes
- Use different colors per category, consistent with brand

## Pie Charts
- Draw clockwise from 12 o'clock position
- Each slice animates in sequence (0.3s per slice)
- Pull out the largest/featured slice slightly

## KPI Counters
- Count from 0 to target value over 1.5-2s
- Use easing (ease-out) for satisfying deceleration
- Flash delta arrow (green up / red down) after count completes
- Format large numbers: 1.2M, 45.3K

## Timing
- 30fps is sufficient for data animations
- Allow 0.5s pause between chart transitions
- Total chart scene: 8-12s maximum
