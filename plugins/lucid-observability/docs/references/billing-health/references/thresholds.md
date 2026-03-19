# Billing Health Thresholds

All magic numbers used in billing health monitoring.

## Outbox Queue

| Metric | Threshold | Severity | Description |
|--------|-----------|----------|-------------|
| Pending events | > 500 | HIGH | Queue backing up — worker can't keep pace |
| Dead letters | > 0 | HIGH | Events failed 10+ delivery attempts |
| Stuck leases | > 0 | MEDIUM | Expired leases — worker may have crashed |
| Zero throughput | sent=0, total>0 | CRITICAL | Events created but none delivered |

## Dead Letter

| Setting | Value | Description |
|---------|-------|-------------|
| Max attempts | 10 | Events with >= 10 attempts are "dead letters" |
| Max retry batch | 500 | Never retry more than 500 events at once |
| Stuck lease timeout | 5 minutes | Lease expired > 5 min ago = stuck |

## Database Pool

| Setting | Value | Description |
|---------|-------|-------------|
| Max connections | 3 | PG pool max (per service) |
| Idle timeout | 30 seconds | PG pool idle timeout |

## Anomaly Detection

| Setting | Value | Description |
|---------|-------|-------------|
| Spike threshold | 3x | Usage ratio above baseline to flag as spike |
| Recent window | 24 hours | Current measurement window |
| Baseline window | 168 hours | Historical averaging window |
