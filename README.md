# Lucid Observability

Pure-markdown skill package for production observability. Teaches AI agents how to triage Sentry issues, run incident response, correlate cross-service errors, monitor billing pipelines, and enforce OTel conventions.

**No code. No dependencies. Just domain knowledge as markdown.**

> **v4.0.0** --- Rewrote from 16 TypeScript MCP tools to 7 pure-markdown AgentSkills. Uses official Sentry MCP + Supabase MCP for all API access.

## Install

### Claude Code

Add to your `.claude/settings.json`:

```json
{
  "plugins": ["lucid-observability"]
}
```

### OpenClaw

Add to your `openclaw.json`:

```json
{
  "plugins": ["lucid-observability"]
}
```

## Prerequisites

This skill package requires two MCP servers to be connected:

| MCP Server | Purpose | Env Vars |
|------------|---------|----------|
| [Sentry MCP](https://github.com/getsentry/sentry-mcp) | Error tracking, issue management | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` |
| [Supabase MCP](https://github.com/supabase/supabase-mcp) | Database queries for billing pipeline | `DATABASE_URL` |

## Skills (7)

| Skill | Description |
|-------|-------------|
| **triage** | Root cause analysis with pattern matching, temporal detection, severity scoring |
| **incident-response** | 4-phase workflow (assess/diagnose/mitigate/document) with 10 category runbooks |
| **correlation** | Cross-service error correlation using trace IDs across 6 platform services |
| **billing-health** | OpenMeter outbox monitoring, dead letter recovery, usage anomaly detection |
| **conventions** | OTel span names, attribute keys, PII rules, sampling configuration |
| **production-readiness** | Env var audit checklist with scoring and deployment verification |
| **alerting** | Sentry alert rule templates, frequency heuristics, notification routing |

## Autonomous Monitoring

The `HEARTBEAT.md` file defines 4 periodic checks:
1. **Outbox Health** --- dead letters, stuck leases, queue depth
2. **Error Spike Detection** --- high-count issues, fatal errors, regressions
3. **Config Health** --- critical environment variables
4. **Diagnosis** --- auto-triage any issues found

## Project Structure

```
skill.yaml                    # Package manifest
HEARTBEAT.md                  # Autonomous monitoring checks
skills/
  triage/
    SKILL.md                  # Triage procedure
    references/
      diagnosis-patterns.md   # 12 error patterns (4 Lucid + 8 built-in)
      temporal-patterns.md    # Burst/steady/regression/sporadic detection
      known-bugs.md           # Known bug registry
      severity-matrix.md      # CRITICAL/HIGH/MEDIUM/LOW scoring
  incident-response/
    SKILL.md                  # 4-phase IR workflow
    references/runbooks/      # 10 category-specific runbooks
  correlation/
    SKILL.md                  # Cross-service correlation procedure
    references/
      services.md             # 6-service topology + dependency graph
      trace-flow.md           # W3C trace propagation paths
  billing-health/
    SKILL.md                  # Metering pipeline monitoring
    references/
      outbox-queries.md       # Outbox SQL queries
      usage-queries.md        # Per-org usage SQL
      anomaly-detection.md    # Spike/drop algorithm
      thresholds.md           # All threshold constants
  conventions/
    SKILL.md                  # 6 convention rules
    references/
      span-names.md           # 20 canonical span names
      attributes.md           # 19 attribute keys with PII flags
      sampling.md             # Head + tail sampling config
  production-readiness/
    SKILL.md                  # Env var checklist + scoring
  alerting/
    SKILL.md                  # Alert rule templates + heuristics
```

## Part of Lucid Foundation

This is the flagship skill package from [lucid.foundation](https://lucid.foundation). All skills follow the AgentSkills open standard.

## License

MIT
