# Trace Flow Paths

## Request Flow Paths

### 1. User Request → LLM Response
```
lucid-web → lucid-worker → lucid-l2 (via lucid-trustgate) → LLM Provider
```

### 2. User Request → Tool Execution
```
lucid-web → lucid-worker → lucid-mcpgate → MCP Server
```

### 3. Internal Service Communication
```
All internal hops propagate W3C Trace Context (traceparent header)
```

### 4. External Boundaries
```
External hops (to LLM providers, MCP servers) do NOT propagate trace context
```

## W3C Trace Context Propagation

- All Lucid services propagate `traceparent` and `tracestate` headers on internal HTTP calls
- The `trace_id` from the header is attached to Sentry events via `enrichSentryEvent()` in `beforeSend`
- External calls (to LLM providers, MCP servers) do **not** receive trace context — they are leaf spans

## Correlation Strategy

When correlating errors by `trace_id`:
- Errors in services connected by internal hops will share the same `trace_id`
- Errors in external services (LLM providers, MCP servers) will NOT have the same `trace_id`
- Use `run_id` to correlate across the full request lifecycle including external calls

When correlating errors by `run_id`:
- `run_id` is a Lucid-specific UUID assigned per user request
- It propagates to all services (internal and external) as a Sentry tag
- More comprehensive than `trace_id` but requires `enrichSentryEvent()` setup
