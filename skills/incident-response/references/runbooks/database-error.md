# Database Connectivity / Query Error
**Severity**: CRITICAL

## Triage
1. Check Supabase dashboard for database health
2. Check if all services affected or specific ones
3. Check connection pool metrics

## Diagnose
1. Classify error type:
   - Connection refused/timeout → pool exhaustion or DB down
   - Unique constraint → duplicate insert race condition
   - Deadlock → concurrent transaction conflict
2. Use billing-health skill for outbox health check
3. Check if recent migrations caused the issue

## Mitigate
1. Restart affected service to reset connection pool
2. Enable read-only or cached mode if available
3. Kill long-running queries via Supabase dashboard

## Resolve
1. Fix connection pool config (max: 3, idle timeout: 30s recommended)
2. Optimize slow queries identified in error traces
3. Apply missing migrations if that's the root cause

## Postmortem
1. Add connection pool monitoring
2. Set up 80% pool utilization alerts
3. Review query performance budget
