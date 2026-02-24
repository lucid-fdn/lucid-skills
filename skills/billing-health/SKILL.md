---
name: billing-health
description: "Monitor OpenMeter billing pipeline: outbox health, per-org usage, dead letter recovery, and anomaly detection"
requires:
  mcps: [supabase]
---

# Billing Health

Monitor the OpenMeter metering pipeline using Supabase MCP for direct SQL queries against the outbox ledger.

## Prerequisites

- **Supabase MCP**: `execute_sql` tool
- Database access to the `openmeter_event_ledger` table

## Monitoring Procedures

### 1. Outbox Health Check

Use Supabase MCP `execute_sql` with this query to assess queue health:

```sql
SELECT
  COUNT(*) FILTER (WHERE sent_at IS NULL AND attempts < 10) AS pending,
  COUNT(*) FILTER (WHERE sent_at IS NOT NULL) AS sent,
  COUNT(*) FILTER (WHERE attempts >= 10) AS dead_letter,
  COUNT(*) FILTER (WHERE lease_until IS NOT NULL AND lease_until > now()) AS leased,
  COUNT(*) AS total
FROM openmeter_event_ledger
WHERE created_at > now() - interval '24 hours'
```

See [references/outbox-queries.md](references/outbox-queries.md) for all outbox queries.

Interpret results using [references/thresholds.md](references/thresholds.md):
- `pending > 500` → HIGH QUEUE DEPTH
- `dead_letter > 0` → DEAD LETTERS — events failed 10+ times
- Stuck leases (expired but unsent) → outbox worker may be down
- `sent = 0` with `total > 0` → NO EVENTS DELIVERED — check API connectivity

### 2. Per-Org Usage Breakdown

See [references/usage-queries.md](references/usage-queries.md) for SQL queries that break down usage by org, provider, and model.

### 3. Dead Letter Recovery

When dead letters exist, retry them with this procedure:
1. Check the top errors first (see outbox-queries.md "Top Errors" query)
2. Fix the root cause (usually API key, timeout, or connectivity)
3. Run the retry query (see outbox-queries.md "Dead Letter Retry" query)
4. Re-check outbox health to verify events are being delivered

### 4. Usage Anomaly Detection

See [references/anomaly-detection.md](references/anomaly-detection.md) for the spike/drop detection algorithm.
