---
name: incident-response
description: "Structured incident response workflow with category-specific runbooks for 10 error types"
requires:
  mcps: [sentry, supabase]
---

# Incident Response

Structured 4-phase incident response workflow using Sentry MCP and Supabase MCP.

## Prerequisites

- **Sentry MCP**: `list_issues`, `get_issue_details`, `search_issues`, `update_issue`
- **Supabase MCP**: `execute_sql` (for outbox/metering queries)

## The 4-Phase Workflow

### Phase 1: Assess

1. Use Sentry MCP `list_issues` sorted by `priority` to get the current state
2. Use Sentry MCP `search_issues` with `trace_id` to check blast radius across services
3. Determine: Is this isolated to one service or a cross-service cascade?
4. Count affected users (`userCount` from issue metadata)

### Phase 2: Diagnose

1. Use the [triage skill](../triage/SKILL.md) to run full diagnosis on the primary issue
2. Identify the error category (see Category Selection below)
3. Open the matching runbook from [references/runbooks/](references/runbooks/)
4. For billing/metering issues: use the [billing-health skill](../billing-health/SKILL.md)

### Phase 3: Mitigate

1. Follow the **mitigate** section of the category runbook
2. If CRITICAL: consider immediate rollback
3. If cascade detected: start with the upstream service (oldest error)
4. Use Sentry MCP `update_issue` to resolve when fix is confirmed deployed

### Phase 4: Document

1. Record incident timeline: when detected, when mitigated, when resolved
2. Document root cause and fix applied
3. List follow-up items: tests to add, alerts to create, monitoring gaps
4. Use the [alerting skill](../alerting/SKILL.md) to ensure alert coverage

## Category Selection

Choose the runbook based on the diagnosed category from the triage skill:

| Category | Runbook | When to Use |
|----------|---------|-------------|
| network_error | [network-error.md](references/runbooks/network-error.md) | ECONNREFUSED, ENOTFOUND, ETIMEDOUT, fetch failures |
| timeout | [timeout.md](references/runbooks/timeout.md) | AbortError, deadline exceeded, slow operations |
| auth_error | [auth-error.md](references/runbooks/auth-error.md) | 401, 403, expired keys, Privy failures |
| rate_limit | [rate-limit.md](references/runbooks/rate-limit.md) | 429, quota exceeded, too many requests |
| database_error | [database-error.md](references/runbooks/database-error.md) | Postgres errors, pool exhaustion, deadlocks |
| validation_error | [validation-error.md](references/runbooks/validation-error.md) | Zod parse errors, schema mismatches |
| metering_failure | [metering-failure.md](references/runbooks/metering-failure.md) | OpenMeter outbox, dead letters, billing gaps |
| provider_outage | [provider-outage.md](references/runbooks/provider-outage.md) | LLM provider down, fallback routing |
| memory_leak | [memory-leak.md](references/runbooks/memory-leak.md) | OOM kills, heap growth, restarts |
| deployment_regression | [deployment-regression.md](references/runbooks/deployment-regression.md) | Post-deploy error spike, regression flag |
