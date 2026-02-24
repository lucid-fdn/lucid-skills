# Heartbeat Checks

Autonomous monitoring checks to run periodically. These checks use the official Sentry MCP and Supabase MCP servers.

## Check 1: Outbox Health

**Tool**: Supabase MCP `execute_sql`

Run the outbox health query from [skills/billing-health/references/outbox-queries.md](skills/billing-health/references/outbox-queries.md):

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

**Alert if**:
- `dead_letter > 0` — events failing delivery
- Stuck leases (lease expired > 5 min, unsent) — worker may be down
- `pending > 500` — queue backing up
- `sent = 0` AND `total > 0` — no events delivered

**Action**: Follow [billing-health skill](skills/billing-health/SKILL.md) for diagnosis and recovery.

## Check 2: Error Spike Detection

**Tool**: Sentry MCP `list_issues`

Query: `is:unresolved`, sort by `freq`, limit 10, for each project:
- `lucid-web`
- `lucid-worker`
- `lucid-l2`
- `lucid-trustgate`
- `lucid-mcpgate`
- `javascript-nextjs`

**Alert if**:
- Any issue with `count > 100`
- Any unresolved `fatal` level issue
- Any issue flagged `isRegression: true`

**Action**: Follow [triage skill](skills/triage/SKILL.md) for diagnosis and severity scoring.

## Check 3: Config Health

Check critical environment variables are set:
- `SENTRY_DSN` — required for error tracking
- `SENTRY_AUTH_TOKEN` — required for Sentry API access
- `OTEL_HASH_SALT` — required in production for PII protection

**Alert if**: Any critical variable is missing.

**Action**: Follow [production-readiness skill](skills/production-readiness/SKILL.md) for full audit.

## Check 4: Diagnosis

If any alerts were triggered in Checks 1-3:
1. For Sentry issues: run the [triage skill](skills/triage/SKILL.md) procedure
2. Score severity using the [severity matrix](skills/triage/references/severity-matrix.md)
3. If CRITICAL or HIGH: follow [incident-response skill](skills/incident-response/SKILL.md)
4. Report findings with severity, category, and recommended next steps
