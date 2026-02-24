# Known Bugs

Check incoming issues against these known bugs. If keywords match, prioritize the known fix.

## Active Known Bugs

### openmeter-30ms
- **Title**: OpenMeter client 30ms timeout
- **Keywords**: `openmeter`, `aborterror`, `timeout`, `30`
- **Description**: The OpenMeter client had `timeoutMs=30` instead of `5000`, causing silent AbortErrors in production. Events were written to the outbox ledger but never delivered to OpenMeter.
- **Fix**: Fixed in `packages/metering/src/client.ts` — verify `timeoutMs=5000`
- **Status**: FIXED

---

## Template for Adding New Known Bugs

When you discover a recurring issue with a known fix, add it here:

```
### [id]
- **Title**: [Short description]
- **Keywords**: [comma-separated keywords that match this bug]
- **Description**: [What happens and why]
- **Fix**: [Exact file/config change that fixes it]
- **Status**: FIXED | OPEN | WORKAROUND
```
