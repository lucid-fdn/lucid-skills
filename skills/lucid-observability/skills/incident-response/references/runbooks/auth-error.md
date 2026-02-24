# Authentication / Authorization Failure
**Severity**: HIGH

## Triage
1. Check if all tenants affected or specific ones (check `tenant_id` tag)
2. Check Sentry tags for `tenant_id` pattern
3. Check if started after a deployment (compare `firstSeen` to deploy time)

## Diagnose
1. Check API key validity and expiration
2. Verify auth configuration (Privy app ID, API keys)
3. Distinguish 401 (unauthenticated) vs 403 (unauthorized) — different root causes

## Mitigate
1. If key rotation issue: rollback to previous keys
2. Regenerate affected tenant API keys
3. If Privy outage: check Privy status page, wait for recovery

## Resolve
1. Fix the root cause (expired key, misconfiguration, provider issue)
2. Verify with test request from affected tenant
3. Notify affected tenants about the resolution

## Postmortem
1. Add API key expiry monitoring
2. Set up auth error rate alerts (> 5% of requests = alert)
3. Document key rotation procedure
