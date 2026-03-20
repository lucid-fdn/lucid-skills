# Temporal Pattern Detection

Classify the timing of events for a Sentry issue to understand whether it's a burst, steady stream, regression, or sporadic occurrence.

## Algorithm

Given a list of event timestamps (from `list_issue_events`):

1. Sort timestamps descending (newest first)
2. Calculate inter-event gaps (time between consecutive events)
3. Classify using the rules below (first match wins)

## Patterns

### Burst
- **Rule**: 80%+ of events fall within the first 20% of the total time span
- **Requires**: Total time span > 1 hour
- **Indicates**: Likely triggered by a deployment, config change, or external event
- **Action**: Check recent deployments, config changes, or provider status changes

### Steady
- **Rule**: Coefficient of variation (CV) of inter-event gaps < 0.5
- **Formula**: CV = standard_deviation(gaps) / mean(gaps)
- **Requires**: At least 5 events
- **Indicates**: Systemic issue — happens at a regular rate
- **Action**: This is an ongoing problem, not a one-time event. Investigate root cause.

### Regression
- **Rule**: Maximum gap between consecutive events > 5x the average gap
- **Requires**: At least 3 events
- **Indicates**: Bug was fixed (long gap) then reintroduced (new cluster)
- **Action**: Check if a previously resolved issue was reintroduced. Compare release tags before and after the gap.

### Sporadic
- **Rule**: None of the above patterns match
- **Indicates**: Edge case, race condition, or intermittent external factor
- **Action**: Look for specific conditions that trigger it (user agent, region, payload size)

### Unknown
- **Rule**: Fewer than 2 events
- **Indicates**: Cannot determine pattern
- **Action**: Wait for more events or investigate the single occurrence manually
