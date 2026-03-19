# Severity Matrix

Score issue severity based on Sentry issue metadata.

## Severity Levels

### CRITICAL
**Any of**:
- `level` = `fatal`
- `count` > 1000
- `count` > 100 AND last activity within the last hour

**Action**: Immediate escalation. Consider rollback. Follow incident-response skill.

### HIGH
**All of**:
- `level` = `error`
- AND (`count` > 100 OR `userCount` > 10)

**Action**: Link to deploy diff if post-deployment. Suggest revert. Assign to on-call.

### MEDIUM
**All of**:
- `level` = `error`
- AND `count` > 10

**Action**: Create investigation ticket. Monitor trend over 24h.

### LOW
**Everything else**

**Action**: Monitor. Auto-resolve if < 5 occurrences per day for 3 consecutive days.

## Service Context

After scoring severity, enrich with service context:
- Look up the `service` tag to find the repo, runtime, and framework
- Calculate issue age: `(now - firstSeen)` in days
- Check if `lastSeen` is within the last hour (active issue)
- Service map: see [correlation/references/services.md](../../correlation/references/services.md)

## Recommended Next Steps by Severity

| Severity | Next Steps |
|----------|-----------|
| CRITICAL | 1. Follow incident-response skill immediately 2. Check cross-service cascade 3. Consider rollback |
| HIGH | 1. Run full triage procedure 2. Check correlation 3. Generate runbook |
| MEDIUM | 1. Run diagnosis pattern matching 2. Create ticket 3. Monitor 24h trend |
| LOW | 1. Check if known bug 2. Monitor 3. Auto-resolve if quiet |
