---
name: correlation
description: "Cross-service error correlation using trace IDs and run IDs across the Lucid platform"
requires:
  mcps: [sentry]
---

# Cross-Service Correlation

Correlate errors across services using trace IDs and run IDs to detect cascading failures.

## Prerequisites

- **Sentry MCP**: `search_issues`, `get_issue_details`

## Correlation Procedure

### Step 1: Extract Correlation IDs

From the issue being investigated, look for these tags:
- `trace_id` — W3C Trace Context ID (32-char hex)
- `run_id` — Lucid run UUID (links all operations in a single user request)

If neither exists, correlation is not possible. Check that `enrichSentryEvent()` is called in `beforeSend` to attach these tags.

### Step 2: Search Across All Projects

Use Sentry MCP `search_issues` with query `trace_id:{id}` (or `run_id:{id}`) for each of these projects:
- `lucid-web`
- `lucid-worker`
- `lucid-l2`
- `lucid-trustgate`
- `lucid-mcpgate`
- `javascript-nextjs`

**Rate limit strategy**: Search 6 projects in a batch (all at once is fine for 6 projects).

### Step 3: Deduplicate and Sort

- Deduplicate results by issue ID (same issue may appear in multiple searches)
- Sort by `lastSeen` descending (newest first)
- Note which services are affected

### Step 4: Detect Cascade

If errors appear in **more than one service** for the same trace:
- **Cascade detected** — this is a cross-service failure
- Investigate the **oldest error first** (likely the root cause)
- The error propagation path usually follows the service dependency graph

If errors appear in **only one service**:
- Isolated failure — no cascade
- Focus diagnosis on that single service

If **no errors found**:
- Verify `enrichSentryEvent()` is called in `beforeSend` to attach `trace_id` and `run_id` tags
- The trace may exist in OTel but not have triggered Sentry errors

### Step 5: Build Timeline

Present the correlated issues as a timeline:
1. Service name + Sentry project
2. Issue title and severity
3. Event count and user count
4. First seen and last seen timestamps
5. Analysis: which service was the origin, which were downstream effects

## Service Dependencies

See [references/services.md](references/services.md) for the full service topology and dependency graph.

## Trace Flow

See [references/trace-flow.md](references/trace-flow.md) for how traces propagate between services.
