# OpenMeter / Billing Metering Failure
**Severity**: HIGH

## Triage
1. Use billing-health skill outbox health check
2. Check OpenMeter API status page
3. Check if outbox worker process is running

## Diagnose
1. Check dead letter error messages (top errors from outbox query)
2. Verify `OPENMETER_API_KEY` is valid
3. Check timeout config — known bug: `timeoutMs=30` instead of `5000` (see triage/references/known-bugs.md)
4. Check for stuck leases (outbox worker may have crashed mid-batch)

## Mitigate
1. Retry dead letters using billing-health skill dead letter retry procedure
2. Restart outbox worker process
3. **No data loss**: events are stored in the `openmeter_event_ledger` table and will be delivered once the worker recovers

## Resolve
1. Fix API connectivity (key, endpoint, timeout)
2. Fix timeout config if it's the 30ms bug
3. Retry all dead letters
4. Verify billing totals match expected values

## Postmortem
1. Add outbox depth alert (pending > 500)
2. Add dead letter alert (dead_letter > 0)
3. Verify the 3-transaction pattern is working (create → lease → send)
