# Request Timeout / AbortError
**Severity**: MEDIUM-HIGH

## Triage
1. Determine if timeouts are in LLM calls, database, or other operations
2. Check configured timeout values
3. Check correlation with load/traffic spikes

## Diagnose
1. Check stack trace for timeout source (which function, which service)
2. Check span durations in OTel traces (if available)
3. For database timeouts: check connection pool usage

## Mitigate
1. Switch to streaming for LLM calls to avoid long-held connections
2. Increase database connection pool size if pool exhaustion
3. Add request queuing for burst traffic

## Resolve
1. Increase timeout for legitimately slow operations
2. Optimize the slow operation (caching, query optimization)
3. Add caching layer for repeated expensive calls

## Postmortem
1. Review all timeout values across services
2. Add latency percentile monitoring (p50, p95, p99)
3. Set up p99 latency alerts
