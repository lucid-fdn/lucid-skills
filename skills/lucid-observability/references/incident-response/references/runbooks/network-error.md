# Network / Provider Connectivity Failure
**Severity**: HIGH

## Triage
1. Check Sentry error volume trend — is it increasing or stabilizing?
2. Identify affected provider from stack trace (LiteLLM, Privy, external API)
3. Check provider status page

## Diagnose
1. Use Sentry MCP `get_issue_details` for full stack trace
2. Use correlation skill to check for cross-service cascade
3. Classify error type:
   - `ECONNREFUSED` → service is down
   - `ENOTFOUND` → DNS resolution failure
   - `ETIMEDOUT` → network path issue or firewall

## Mitigate
1. Verify LLM fallback routing is working (LiteLLM config)
2. Check egress network connectivity from the service runtime
3. Enable circuit breaker if error rate > 50%

## Resolve
1. Wait for provider recovery if external outage
2. Fix DNS or network config if internal issue
3. Update fallback routes if provider permanently changed

## Postmortem
1. Document incident timeline with timestamps
2. Verify alert rules caught the issue promptly
3. Review retry and circuit breaker logic — add if missing
