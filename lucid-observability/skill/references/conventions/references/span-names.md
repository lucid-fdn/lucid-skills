# Canonical Span Names

All Lucid platform services MUST use these exact span names for instrumentation.

| Span Name | Description |
|-----------|-------------|
| `inbound.pipeline` | Full inbound message pipeline: dedup → lock → rate limit → LLM → encrypt → store |
| `llm.call` | Single LLM provider invocation |
| `tool.execute` | Single tool execution |
| `encrypt.message` | Message encryption |
| `memory.extract` | Memory extraction pipeline |
| `trustgate.chat_completion` | TrustGate chat completion request |
| `trustgate.embedding` | TrustGate embedding request |
| `trustgate.llm_proxy` | TrustGate LLM proxy call to LiteLLM |
| `mcpgate.tool_discover` | MCPGate tool discovery |
| `mcpgate.tool_execute` | MCPGate tool execution |
| `mcpgate.server_health` | MCPGate server health check |
| `auth.verify` | API key / auth verification |
| `quota.check` | Quota enforcement check |
| `policy.check` | Policy enforcement check |
| `metering.insert` | Metering event insertion |
| `outbound.deliver` | Outbound message delivery |
| `l2.proxy.call` | HTTP request to Lucid-L2 gateway |
| `db.query` | Database query (Supabase) |
| `rate_limit.check` | Rate limiter check |
| `dedup.check` | Deduplication check |

## Naming Convention

Pattern: `domain.operation`

- `domain` = service or subsystem (e.g., `trustgate`, `mcpgate`, `llm`, `db`)
- `operation` = the specific action (e.g., `call`, `execute`, `check`, `insert`)

When adding new spans, follow this pattern. Keep names short and descriptive.
