# Memory Leak / OOM
**Severity**: CRITICAL

## Triage
1. Check for OOM kills in service logs (Railway dashboard)
2. Check restart frequency — frequent restarts indicate memory pressure
3. Check current heap usage if service is still running

## Diagnose
1. Take heap snapshot if possible (Node.js `--inspect` flag)
2. Check for common Node.js memory leak patterns:
   - Unbounded caches (Map/Set that never clears)
   - Event listener leaks (addEventListener without removeEventListener)
   - Unclosed streams or database connections
3. Check correlation with request volume (leak rate proportional to traffic?)

## Mitigate
1. Restart affected service immediately to restore memory
2. Increase memory limit temporarily (Railway service settings)
3. Set `--max-old-space-size=512` (or appropriate limit) for Node.js

## Resolve
1. Find and fix the memory leak in code
2. Add memory monitoring to OTel instrumentation
3. Add graceful shutdown on memory threshold (e.g., restart at 80% of limit)

## Postmortem
1. Add heap memory metric to OTel exports
2. Alert on memory > 80% of limit
3. Add periodic heap snapshots in staging for early detection
