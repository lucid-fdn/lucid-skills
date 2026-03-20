---
name: conventions
description: "OTel observability conventions: span naming, attribute keys, PII rules, and sampling configuration"
---

# Observability Conventions

Standard conventions for OpenTelemetry instrumentation across the Lucid platform.

## The 6 Rules

1. **Identity keys** (tenant_key, session_key, user_key) **MUST** be hashed via `hashForTelemetry()` — they are PII
2. **UUIDs** (run_id, conversation_id, message_id) are OK raw — they are NOT PII
3. UUIDs are **HIGH CARDINALITY** — NEVER use as metric labels
4. **Content** (plaintext, ciphertext, prompts, tool args) is **NEVER** an attribute
5. Use `LUCID_ENV` not `NODE_ENV` for environment detection
6. All services use **head + tail sampling**: head captures baseline, tail captures 100% errors

## Span Names

See [references/span-names.md](references/span-names.md) for the canonical list of 20 span names and their descriptions.

When reviewing or writing instrumentation code:
- Use exact span names from the reference list
- Each span name maps to a specific operation
- New span names should follow the `domain.operation` pattern

## Attribute Keys

See [references/attributes.md](references/attributes.md) for all 19 standard attribute keys with PII and cardinality flags.

When reviewing attributes:
- Check PII flag — PII attributes MUST be hashed
- Check high cardinality flag — high cardinality attributes MUST NOT be metric labels
- Use the exact key names from the reference list

## Sampling

See [references/sampling.md](references/sampling.md) for head/tail sampling configuration.

## Convention Compliance Check

When auditing a service for convention compliance:

1. **Verify service is in the topology** — check correlation/references/services.md
2. **Check Sentry project exists** — verify the sentryProject mapping
3. **Check span names** — service should implement spans that match its domain prefix
4. **Check PII handling** — all PII attributes must use `hashForTelemetry()`
5. **Check sampling config** — verify rates match the environment
6. **Check LUCID_ENV** — must be set, not relying on NODE_ENV
