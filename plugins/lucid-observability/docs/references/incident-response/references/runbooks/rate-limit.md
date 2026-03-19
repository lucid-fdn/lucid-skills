# Rate Limit / Quota Exceeded
**Severity**: MEDIUM

## Triage
1. Determine: tenant-level quota vs provider-level rate limit
2. Use billing-health skill to check per-org usage
3. Check for 429 responses in Sentry events

## Diagnose
1. Use billing-health skill anomaly detection for usage spikes
2. Check if single org spike or distributed across many
3. Review `quota.check` spans in traces

## Mitigate
1. Increase quota for legitimate high-usage users
2. Enable request queuing to smooth burst traffic
3. Switch to a higher-limit LLM provider via fallback routing

## Resolve
1. Adjust quotas to match actual plan limits
2. Add rate limiting at the gateway level (lucid-trustgate)
3. Configure fallback routing for provider rate limits

## Postmortem
1. Review quota settings for all tiers
2. Add 80% usage threshold alerts
3. Document quota management procedures
