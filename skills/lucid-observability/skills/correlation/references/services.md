# Lucid Platform Service Topology

## Services

| Service | Repo | Runtime | Framework | Sentry Project |
|---------|------|---------|-----------|---------------|
| lucid-web | LucidMerged | Vercel | Next.js | javascript-nextjs |
| lucid-worker | LucidMerged | Railway | Node/Fastify | lucid-worker |
| lucid-l2 | Lucid-L2 | Railway | Express | lucid-l2 |
| lucid-trustgate | lucid-plateform-core | Railway | Fastify | lucid-trustgate |
| lucid-mcpgate | lucid-plateform-core | Railway | Fastify | lucid-mcpgate |
| lucid-control-plane | lucid-plateform-core | Railway | Fastify | lucid-control-plane |

## Dependency Graph

```
lucid-web
├── lucid-worker
│   ├── lucid-l2
│   │   ├── Supabase
│   │   ├── Nango
│   │   └── Redis
│   ├── Supabase
│   └── Redis
├── lucid-l2
├── Supabase
└── Privy

lucid-trustgate
├── LiteLLM → LLM Providers
├── Supabase
└── OpenMeter

lucid-mcpgate
├── MCP Servers
├── Supabase
└── OpenMeter

lucid-control-plane
└── Supabase
```

## Cascade Analysis

When investigating a cross-service error:
1. Start with the **most upstream** service in the dependency graph
2. Common cascade paths:
   - `lucid-web → lucid-worker → lucid-l2` (request processing chain)
   - `lucid-trustgate → LiteLLM → LLM Provider` (LLM call chain)
   - `lucid-mcpgate → MCP Server` (tool execution chain)
3. External dependencies (Supabase, Redis, Privy, LiteLLM) affect multiple services simultaneously
4. If an external dependency is down, expect errors in all services that depend on it
