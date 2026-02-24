---
name: production-readiness
description: "Production readiness audit: environment variable checklist, scoring, and deployment verification"
---

# Production Readiness

Audit a Lucid platform service for production readiness by checking environment variables, configuration, and observability setup.

## Environment Variable Checklist

| Variable | Category | Required | Pass Condition | Fail Impact |
|----------|----------|----------|---------------|-------------|
| `SENTRY_DSN` | Sentry | Yes | Set to valid DSN | Error tracking disabled — blind to production errors |
| `SENTRY_AUTH_TOKEN` | Sentry | Warn | Set to valid token | Agent cannot query Sentry API — no automated triage |
| `OTEL_ENABLED` | OTel | Warn | `= "true"` | No distributed traces — blind to cross-service issues |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTel | Conditional | Not localhost in production | Traces go nowhere in production |
| `OTEL_HASH_SALT` | PII | Yes (prod) | Set (any value) | Identity fields not hashed — PII leak in telemetry |
| `OPENMETER_ENABLED` | Metering | Warn | `= "true"` | Usage metering disabled — billing inaccurate |
| `OPENMETER_API_KEY` | Metering | Conditional | Set when OPENMETER_ENABLED=true | Metering events will fail delivery |
| `DATABASE_URL` | Database | Warn | Set to valid URL | Metering queries unavailable |
| `LUCID_ENV` | Environment | Warn | Set explicitly | Environment detection unreliable — use LUCID_ENV not NODE_ENV |

## Audit Procedure

### Step 1: Check Each Variable

For each variable in the checklist:
- **pass**: Variable is set and meets the pass condition
- **warn**: Variable is missing or misconfigured but service can still run (degraded)
- **fail**: Variable is missing and service will malfunction in production

### Step 2: Conditional Checks

Some checks depend on others:
- `OTEL_EXPORTER_OTLP_ENDPOINT`: Only check if `OTEL_ENABLED=true`. In production, fail if endpoint is localhost or unset.
- `OPENMETER_API_KEY`: Only check if `OPENMETER_ENABLED=true`. Fail if enabled but key missing.

### Step 3: Calculate Score

```
score = (passing_checks / total_checks) × 100
```

### Step 4: Determine Production Readiness

**Production Ready**: `failing_checks = 0` AND `score >= 70%`

- 0 failures ensures no critical functionality is broken
- 70% threshold allows some warnings (e.g., optional features disabled)

### Step 5: Report

Present results as:
1. Summary: environment, total checks, passing, warnings, failing, score
2. Per-check details: category, variable, status, message, fix instruction
3. Critical fixes: list of all failing checks with fix instructions

### Step 6: Recommendations

Based on results:
- **All passing**: Service is production-ready. Verify with the conventions skill for instrumentation compliance.
- **Warnings only**: Service will run but with degraded observability. Address warnings before peak traffic.
- **Any failures**: Service is NOT production-ready. Fix all critical issues before deploying.

## Environment-Specific Rules

### Production
- `OTEL_HASH_SALT` is **required** (fail without it) — PII protection
- `OTEL_EXPORTER_OTLP_ENDPOINT` must NOT be localhost
- `SENTRY_DSN` is **required** (fail without it)

### Staging
- Same as production but `OTEL_HASH_SALT` is warn-only (not fail)
- All features should be enabled for full testing

### Development
- Most checks are warn-only
- Focus on `SENTRY_DSN` and `DATABASE_URL` for local development
