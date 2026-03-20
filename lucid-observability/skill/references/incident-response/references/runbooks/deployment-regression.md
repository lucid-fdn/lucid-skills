# Post-Deployment Regression
**Severity**: HIGH

## Triage
1. Check Sentry for issues flagged as `isRegression: true`
2. Compare error rates pre-deploy vs post-deploy using Sentry MCP `get_project_stats`
3. Check the release tag on error events

## Diagnose
1. Use Sentry MCP `get_project_stats` with `period: 1d` and `interval: 1h` to compare rates
2. Check for new error types that appeared after the release
3. Review the deployment diff (commits between last two releases)

## Mitigate
1. If error rate elevated >2x: rollback the deployment
2. If specific feature: disable via feature flag
3. If hotfixable: deploy hotfix and verify error rate drops

## Resolve
1. Fix the regression in code
2. Add test coverage for the broken scenario
3. Deploy fix and verify with Sentry MCP that error rate returns to baseline

## Postmortem
1. Add canary deployment for gradual rollouts
2. Add automated error rate comparison in CI (block deploy if >2x increase)
3. Improve test coverage for the area that regressed
