---
name: triage
description: "Triage and diagnose Sentry issues: root cause analysis, temporal pattern detection, severity scoring, and resolution recommendations"
requires:
  mcps: [sentry]
---

# Triage

Diagnose and triage Sentry issues using the official Sentry MCP server.

## Prerequisites

You need the **Sentry MCP server** connected. The following Sentry MCP tools are used:
- `list_issues` — list issues by project with search syntax
- `get_issue_details` — full issue detail with stack trace, tags, contexts
- `list_issue_events` — event history for an issue
- `update_issue` — resolve, ignore, or unresolve an issue
- `search_issues` — find issues by trace ID or other criteria
- `get_project_stats` — error rate trends over time

## Sentry Projects

The Lucid platform uses these Sentry projects:
- `lucid-web` — Next.js frontend (Vercel)
- `lucid-worker` — Worker service (Railway/Fastify)
- `lucid-l2` — L2 gateway (Railway/Express)
- `lucid-trustgate` — Trust gate (Railway/Fastify)
- `lucid-mcpgate` — MCP gate (Railway/Fastify)
- `javascript-nextjs` — Next.js SSR errors

Sentry org: `raijin-labs`

## Triage Procedure

### Step 1: Get Issue Details

Use Sentry MCP `get_issue_details` with the issue ID. Focus on:
- **Stack trace**: Last 15 frames, prioritize frames marked `[in_app]`
- **Tags**: Look for `trace_id`, `run_id`, `service`, `environment`, `release`
- **Breadcrumbs**: Last 10 breadcrumbs for event timeline context
- **OTel context**: Check `contexts.otel` for trace correlation

### Step 2: Analyze Temporal Pattern

Use Sentry MCP `list_issue_events` (limit 25) and classify the event timing pattern:
- See [references/temporal-patterns.md](references/temporal-patterns.md) for the classification algorithm
- The pattern tells you whether this is a burst (deployment?), steady (systemic), regression (reintroduced), or sporadic (edge case)

### Step 3: Check Cross-Service Correlation

If the issue has `trace_id` or `run_id` tags:
- Use Sentry MCP `search_issues` with query `trace_id:{id}` across all 6 projects
- If errors appear in >1 service → **cascade detected** — investigate the oldest error first
- See the [correlation skill](../correlation/SKILL.md) for detailed cross-service procedure

### Step 4: Match Diagnosis Pattern

Compare the issue title, culprit, and stack trace against known patterns:
- Check **Lucid-specific patterns first** (see [references/diagnosis-patterns.md](references/diagnosis-patterns.md))
- Then check **built-in patterns** (network, timeout, auth, rate limit, database, validation, memory)
- Matching is case-insensitive substring match on title + culprit + stack trace text

### Step 5: Check Known Bugs

Compare against [references/known-bugs.md](references/known-bugs.md):
- If a known bug matches and `status: FIXED`, recommend verifying the fix is deployed
- If a known bug matches and `status: OPEN`, link to the existing fix

### Step 6: Score Severity and Recommend Action

Use [references/severity-matrix.md](references/severity-matrix.md) to score:
- **CRITICAL** → Immediate escalation, consider rollback
- **HIGH** → Link to deploy diff, suggest revert if post-deployment
- **MEDIUM** → Create investigation ticket
- **LOW** → Monitor; auto-resolve if <5 occurrences/day

## Issue Resolution

When to use Sentry MCP `update_issue`:
- **Resolve**: Root cause identified AND fix deployed AND verified in production
- **Ignore**: Known noise (e.g., bot traffic, expected transient errors). Set duration if temporary.
- **Unresolve**: Previously resolved but still occurring — regression detected

## Error Rate Analysis

Use Sentry MCP `get_project_stats` to analyze trends:
- `stat: received` — total errors ingested
- `stat: rejected` — errors dropped by rate limits
- `interval: 1h` for recent spikes, `1d` for weekly trends
- `period: 7d` or `14d` for baseline comparison
- Compare current rate to 7-day average — >2x is a spike, >5x is an incident
