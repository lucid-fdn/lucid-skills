# Usage Anomaly Detection

Detect sudden spikes or drops in token usage by comparing a recent window against a baseline.

## Algorithm

```sql
WITH recent AS (
  SELECT org_id,
    SUM(total_tokens) AS recent_tokens,
    COUNT(*) AS recent_requests
  FROM openmeter_event_ledger
  WHERE created_at > now() - interval '24 hours'
  GROUP BY org_id
),
baseline AS (
  SELECT org_id,
    SUM(total_tokens) / GREATEST(
      EXTRACT(EPOCH FROM interval '168 hours') /
      EXTRACT(EPOCH FROM interval '24 hours'), 1
    ) AS avg_tokens,
    COUNT(*) / GREATEST(
      EXTRACT(EPOCH FROM interval '168 hours') /
      EXTRACT(EPOCH FROM interval '24 hours'), 1
    ) AS avg_requests
  FROM openmeter_event_ledger
  WHERE created_at > now() - interval '168 hours'
    AND created_at <= now() - interval '24 hours'
  GROUP BY org_id
)
SELECT COALESCE(r.org_id, b.org_id) AS org_id,
  r.recent_tokens, r.recent_requests,
  b.avg_tokens AS baseline_tokens,
  b.avg_requests AS baseline_requests,
  CASE WHEN b.avg_tokens > 0
    THEN ROUND((r.recent_tokens / b.avg_tokens)::numeric, 2)
    ELSE NULL END AS token_ratio,
  CASE WHEN b.avg_requests > 0
    THEN ROUND((r.recent_requests / b.avg_requests)::numeric, 2)
    ELSE NULL END AS request_ratio
FROM recent r FULL OUTER JOIN baseline b ON r.org_id = b.org_id
ORDER BY COALESCE(r.recent_tokens, 0) DESC LIMIT 50
```

## Interpretation

- **SPIKE**: `token_ratio >= 3.0` — org is using 3x or more tokens than their baseline average
- **DROP**: Org has `baseline_tokens` but no `recent_tokens` — usage stopped entirely
- **Normal**: `token_ratio` between 0.3 and 3.0

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Recent window | 24 hours | The "current" period to measure |
| Baseline window | 168 hours (7 days) | Historical period for averaging |
| Spike threshold | 3x | Multiple above baseline to flag |
