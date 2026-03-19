# Request Validation / Schema Error
**Severity**: LOW-MEDIUM

## Triage
1. Determine: client bug vs server schema change
2. Identify the failing endpoint and field from error details
3. Check if started after a deployment

## Diagnose
1. Check validation error details (which field, what value)
2. Compare request payload against expected schema
3. Check if client and server are on the same API version

## Mitigate
1. Return detailed validation errors to help clients fix requests
2. Deploy client-side fix if client is sending wrong data
3. Add backwards compatibility if server schema changed

## Resolve
1. Fix the schema mismatch (update client or server)
2. Add integration tests for the affected endpoint
3. Consider API versioning if breaking changes are needed

## Postmortem
1. Add API contract testing to CI pipeline
2. Review deployment order (server before client, or vice versa)
