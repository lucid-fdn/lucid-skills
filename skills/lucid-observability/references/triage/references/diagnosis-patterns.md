# Diagnosis Patterns

## Matching Rule

Case-insensitive substring match on issue **title** + **culprit** + **stack trace text**. Check Lucid-specific patterns first, then built-in patterns. First match wins.

## Lucid-Specific Patterns

### litellm_timeout
- **Keywords**: `litellm`, `timeout`, `llm proxy`
- **Root Cause**: LLM provider timeout via LiteLLM — check provider status and fallback routing
- **Suggestions**:
  - [high] Verify LiteLLM fallback routes are configured
  - [high] Switch to streaming to avoid long connections
- **Related**: Provider degradation, Model overload

### openmeter_timeout
- **Keywords**: `openmeter`, `metering`, `outbox`, `aborterror`
- **Root Cause**: OpenMeter API timeout — verify timeout is 5000ms (known 30ms bug existed)
- **Suggestions**:
  - [high] Verify OpenMeter client `timeoutMs = 5000` (was 30ms — see known-bugs.md)
  - [high] Check outbox health using billing-health skill
- **Related**: Timeout misconfiguration, API connectivity

### privy_auth
- **Keywords**: `privy`, `auth.privy.io`
- **Root Cause**: Privy authentication failure — check Privy app config and service status
- **Suggestions**:
  - [high] Verify `NEXT_PUBLIC_PRIVY_APP_ID` is set and Privy status page is green
- **Related**: Third-party auth outage, Config drift

### mcp_server_down
- **Keywords**: `mcp`, `tool_execute`, `econnrefused`, `mcp server`
- **Root Cause**: MCP server unreachable — check MCP server health and registry
- **Suggestions**:
  - [high] Check MCP server health endpoint
  - [medium] Verify server is registered in MCPGate
- **Related**: Server crash, Registry stale

## Built-In Patterns

### network_error
- **Keywords**: `fetch failed`, `econnrefused`, `enotfound`, `econnreset`, `network`
- **Root Cause**: External service unreachable or network issue
- **Suggestions**:
  - [high] Check upstream provider health
  - [medium] Add retry with exponential backoff
  - [medium] Implement circuit breaker
- **Related**: Provider outage, DNS failure, Connection pool exhaustion

### timeout
- **Keywords**: `timeout`, `aborterror`, `abort`, `deadline`
- **Root Cause**: Operation exceeded time limit
- **Suggestions**:
  - [high] Switch to streaming for long operations
  - [medium] Check connection pool utilization
  - [medium] Review timeout values
- **Related**: Slow response, Pool exhaustion, Resource contention

### auth_error
- **Keywords**: `unauthorized`, `401`, `403`, `forbidden`, `auth`
- **Root Cause**: Authentication or authorization failure
- **Suggestions**:
  - [high] Check if API keys have expired
  - [high] Verify auth configuration
- **Related**: Key rotation, Tenant misconfiguration, CORS

### rate_limit
- **Keywords**: `rate`, `429`, `quota`, `too many`
- **Root Cause**: Rate limit or quota exceeded
- **Suggestions**:
  - [high] Review quota/rate limit settings
  - [medium] Add request queuing
- **Related**: Provider rate limit, Quota exceeded, Burst traffic

### database_error
- **Keywords**: `database`, `postgres`, `unique constraint`, `deadlock`, `connection`
- **Root Cause**: Database connectivity or query issue
- **Suggestions**:
  - [high] Verify database connectivity
  - [medium] Review connection pool config
  - [medium] Ensure migrations are applied
- **Related**: Pool exhaustion, Missing migration, Lock contention

### validation_error
- **Keywords**: `validation`, `zod`, `parse`, `schema`
- **Root Cause**: Request payload failed schema validation
- **Suggestions**:
  - [high] Review API schema
  - [high] Return validation errors in API response
- **Related**: Schema mismatch, Client update needed, Missing field

### memory_leak
- **Keywords**: `heap`, `out of memory`, `oom`
- **Root Cause**: Memory limit exceeded
- **Suggestions**:
  - [high] Take heap snapshot
  - [medium] Verify streams are closed
- **Related**: Unbounded cache, Event listener leak, Large payload

### application_error (fallback)
- **Keywords**: *(none — matches when no other pattern matches)*
- **Root Cause**: Application error in the reported culprit location
- **Suggestions**:
  - [high] Examine the full stack trace
  - [medium] Add breadcrumbs around the error
