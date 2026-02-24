# LLM Provider Outage
**Severity**: HIGH

## Triage
1. Check LLM provider status pages (OpenAI, Anthropic, Google, etc.)
2. Identify which providers are failing from Sentry error tags
3. Use correlation skill to check cascade across services

## Diagnose
1. Identify all affected providers from error patterns
2. Check LiteLLM fallback routing configuration
3. Determine if regional or global outage

## Mitigate
1. Auto-route requests to fallback providers via LiteLLM config
2. Enable degraded mode (reduce features that require LLM)
3. Communicate status to affected tenants

## Resolve
1. Monitor provider recovery on their status page
2. Verify all requests completing successfully post-recovery
3. Check data consistency (any requests lost during outage?)

## Postmortem
1. Document which failure modes were handled and which weren't
2. Verify fallback provider coverage (every model has a fallback)
3. Consider local model fallback for critical paths
