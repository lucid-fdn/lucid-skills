# Standard Attribute Keys

All OTel span attributes used across the Lucid platform.

| Key | Description | PII | High Cardinality |
|-----|-------------|-----|-----------------|
| `lucid.tenant_key_hash` | Hashed tenant key | YES | No |
| `lucid.session_key_hash` | Hashed session key | YES | No |
| `lucid.user_key_hash` | Hashed user key | YES | No |
| `lucid.run_id` | Run ID (UUID) | No | YES |
| `lucid.conversation_id` | Conversation ID | No | YES |
| `lucid.message_id` | Message ID | No | YES |
| `lucid.llm.provider` | LLM provider name | No | No |
| `lucid.llm.model` | LLM model name | No | No |
| `lucid.llm.prompt_tokens` | Prompt token count | No | No |
| `lucid.llm.completion_tokens` | Completion token count | No | No |
| `lucid.llm.total_tokens` | Total token count | No | No |
| `lucid.tool.name` | Tool name | No | No |
| `lucid.tool.duration_ms` | Tool duration ms | No | No |
| `lucid.tenant_id` | Tenant UUID | No | YES |
| `lucid.service` | Canonical service name | No | No |
| `lucid.environment` | Environment name | No | No |
| `http.method` | HTTP method | No | No |
| `http.route` | HTTP route pattern | No | No |
| `http.status_code` | HTTP status code | No | No |

## Rules

### PII Attributes
Attributes marked **PII: YES** MUST be hashed using `hashForTelemetry()` before being set as span attributes. Never store raw identity keys in telemetry.

### High Cardinality Attributes
Attributes marked **High Cardinality: YES** contain unique values per request. They are useful as span attributes for trace-level debugging but MUST NOT be used as:
- Metric labels/dimensions
- Dashboard group-by fields
- Alert rule conditions

### Prohibited Attributes
These are NEVER allowed as span attributes:
- Plaintext message content
- Ciphertext / encrypted content
- LLM prompts or completions (full text)
- Tool arguments or results (full text)
