# Outbox SQL Queries

All queries run against the `openmeter_event_ledger` table via Supabase MCP `execute_sql`.

## Queue Health

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

## Throughput (Hourly Buckets)

```sql
SELECT date_trunc('hour', sent_at) AS hour, COUNT(*) AS events_sent
FROM openmeter_event_ledger
WHERE sent_at > now() - interval '24 hours'
GROUP BY 1 ORDER BY 1 DESC LIMIT 24
```

## Stuck Leases

Events with expired leases that haven't been sent — indicates the outbox worker crashed mid-batch.

```sql
SELECT COUNT(*) AS stuck_count
FROM openmeter_event_ledger
WHERE lease_until < now() - interval '5 minutes'
  AND sent_at IS NULL
  AND attempts < 10
```

## Top Errors

```sql
SELECT last_error, COUNT(*) AS count
FROM openmeter_event_ledger
WHERE attempts > 0 AND created_at > now() - interval '24 hours'
GROUP BY last_error ORDER BY count DESC LIMIT 5
```

## Dead Letter Retry

Reset dead-letter events so the outbox worker picks them up again:

```sql
UPDATE openmeter_event_ledger
SET attempts = 0, lease_until = NULL, lease_owner = NULL, last_error = NULL
WHERE id IN (
  SELECT id FROM openmeter_event_ledger
  WHERE attempts >= 10 AND sent_at IS NULL
  ORDER BY created_at ASC LIMIT 100
)
RETURNING id, org_id, created_at, last_error
```

**Note**: Adjust `LIMIT 100` up to 500 max. Fix the root cause before retrying or events will fail again.
