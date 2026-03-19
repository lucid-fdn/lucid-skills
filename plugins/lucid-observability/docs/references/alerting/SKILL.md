---
name: alerting
description: "Sentry alert rule templates, frequency heuristics, and notification routing for observability coverage"
requires:
  mcps: [sentry]
---

# Alerting

Generate Sentry alert rule configurations and ensure observability coverage across all projects.

## Prerequisites

- **Sentry MCP**: `list_issues` (to analyze current error patterns)

## Standard Alert Rules

Every Sentry project should have these baseline rules:

### 1. New Error Alert
- **Type**: Issue alert
- **Conditions**: New issue created with level: `error` or `fatal`
- **Actions**: Notify `#alerts` Slack channel
- **Frequency**: Once per issue per hour
- **Rationale**: Catches regressions and newly introduced errors

### 2. Error Spike Alert
- **Type**: Issue alert
- **Conditions**: Issue seen > 50 times in 5 minutes
- **Actions**: Notify `#alerts-critical` + PagerDuty
- **Frequency**: Once per issue per 30 minutes
- **Rationale**: Detects error storms that indicate a major incident

### 3. Regression Alert
- **Type**: Issue alert
- **Conditions**: Previously resolved issue regressed
- **Actions**: Notify + assign to the person who last resolved it
- **Frequency**: Once per issue
- **Rationale**: Catches bugs that were fixed but have returned

### 4. High Error Rate Alert
- **Type**: Metric alert
- **Conditions**: Error count > 100 in 10 minutes
- **Actions**: Notify `#alerts-critical`
- **Frequency**: Every 10 minutes while condition is active
- **Rationale**: Aggregate health threshold — catches issues that individually are below spike threshold but collectively indicate problems

## Dynamic Alert Rules

For high-frequency existing issues, generate targeted monitoring rules:

### Frequency Heuristic

1. Use Sentry MCP `list_issues` sorted by `freq` (limit 10) for the project
2. For each issue with `count > 50`:
   - Set alert threshold at **20% of current count per hour**
   - Example: issue has 500 events → alert at 100 events/hour
3. Create an issue alert for each:
   - **Name**: `[project] Monitor: {issue title (first 50 chars)}`
   - **Conditions**: Issue `{title}` > `{threshold}` times per hour
   - **Actions**: Notify `#alerts`
   - **Frequency**: Every 1 hour while active
   - **Rationale**: `Currently #{rank} most frequent ({count} events)`

## Notification Routing

| Severity | Channel | Escalation |
|----------|---------|-----------|
| error (new) | `#alerts` Slack | None — informational |
| error (spike) | `#alerts-critical` Slack + PagerDuty | On-call engineer |
| fatal | `#alerts-critical` Slack + PagerDuty | On-call engineer + team lead |
| regression | `#alerts` Slack + assign to last resolver | Auto-assigned |

## Setup Instructions

1. Go to Sentry → Project Settings → Alerts
2. Create each rule with the conditions specified above
3. Connect Slack integration for channel notifications
4. Connect PagerDuty integration for critical alerts
5. Test each rule with a synthetic error to verify routing

## Coverage Audit

To audit alert coverage for a project:
1. List all current alert rules in Sentry
2. Compare against the 4 standard rules above
3. Check if high-frequency issues have targeted monitoring
4. Verify notification routing is configured correctly
