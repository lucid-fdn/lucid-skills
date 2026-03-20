# lucid-skills

## What This Is
Open-source monorepo of AI agent capabilities for the Lucid platform. Each feature is a self-contained folder with a skill (knowledge) and plugin (runtime) side.

## Structure
```
lucid-trade/                  # One folder per feature
  skill/                      # Knowledge layer (pure markdown, no code)
    SKILL.md                  # Catalog import entrypoint
    references/               # Detailed sub-area docs
  plugin/                     # Runtime layer (TypeScript MCP server)
    package.json              # @lucid-fdn/trade
    plugin.json               # Lucid metadata (type, category, brainLayer)
    src/
    test/

lucid-defi/                   # Docs-only feature (no plugin)
  skill/
    SKILL.md

packages/
  embedded/                   # @lucid-fdn/skills-embedded — bundled MCP factories
  web3-operator/              # @lucid-fdn/web3-operator — 12 web3 tools
  web3-types/                 # @lucid-fdn/web3-types — TypeScript interfaces
  agent-tools-core/           # @lucid-fdn/agent-tools-core — tool metadata

templates/
  plugin-template/            # Starter for new features

scripts/
  validate-plugin-structure.sh
```

## Separation of Concerns

- `skill/` = model behavior, knowledge, workflow guidance. Pure markdown. No build step.
- `plugin/` = executable MCP server, tools, adapters. TypeScript. Needs build.

A plugin can reference its matching skill, but it does not own it.

## Features (22 total)

### Data Intelligence (blockchain data providers)
- **lucid-moralis** — Lucid EVM Intelligence: 141 EVM tools (token security, OHLCV, whale tracking, wallet profiling, liquidity, DeFi). Wraps `@moralisweb3/api-mcp-server`. Env: `MORALIS_API_KEY`
- **lucid-helius** — Lucid Solana Intelligence: 63 Solana tools (wallet analysis, token holders, tx parsing, webhooks, streaming, transfers). Wraps `helius-mcp`. Env: `HELIUS_API_KEY`

### With Brain Layer (structured verdict/score/evidence)
- **lucid-trade** — crypto trading intelligence (5 tools: think, scan, watch, review, pro)
- **lucid-audit** — smart contract security
- **lucid-tax** — crypto tax compliance
- **lucid-predict** — prediction markets
- **lucid-observability** — production monitoring
- **lucid-quantum** — quantum key search

### Standard Plugins
- **lucid-seo** — SEO intelligence
- **lucid-veille** — content monitoring + auto-publishing
- **lucid-compete** — competitive intelligence
- **lucid-hype** — growth hacking / social
- **lucid-prospect** — sales prospecting
- **lucid-recruit** — ATS / hiring
- **lucid-propose** — RFP / proposal engine
- **lucid-bridge** — startup ops (Notion/Linear/Slack/GitHub)
- **lucid-meet** — meeting intelligence
- **lucid-invoice** — billing / revenue
- **lucid-metrics** — product analytics
- **lucid-feedback** — customer feedback/NPS
- **lucid-video** — video generation

### Docs-Only
- **lucid-defi** — DeFi protocols (no MCP server)

## Data Intelligence Architecture
```
Internal agents (embedded, 1-5ms):
  lucid-moralis → @moralisweb3/api-mcp-server → Moralis API → 141 EVM tools
  lucid-helius  → helius-mcp → Helius API → 63 Solana tools

External users (MCPGate HTTP, 50-200ms):
  MCPGate → moralis server → same 141 tools
  MCPGate → helius server  → same 63 tools

Internal branding: "Lucid EVM Intelligence" / "Lucid Solana Intelligence"
MCPGate branding: "moralis" / "helius" (external users know provider names)
```

## Workspaces
```json
{
  "workspaces": ["*/plugin", "packages/*"]
}
```

## Embedded Bundle
`packages/embedded/` re-exports all MCP server factories. Built with tsup, published as `@lucid-fdn/skills-embedded`. Used by the worker for in-process execution via InMemoryTransport.

## Creating a New Feature
1. Copy `templates/plugin-template/` to `lucid-<name>/plugin/`
2. Create `lucid-<name>/skill/SKILL.md`
3. Replace placeholders
4. Register factory in `packages/embedded/src/index.ts`
5. Run `bash scripts/validate-plugin-structure.sh`
6. Push to main — CI handles the rest (see below)

## CI/CD Pipelines (fully automated)

### Skills (auto-import on push)
```
Edit lucid-<name>/skill/SKILL.md → push to main
  → .github/workflows/import-skills.yml
  → scripts/ci-import-skill.mjs
  → Supabase skill_catalog (status=approved)
  → Available to agents immediately
```

### Plugins (auto-build + publish on push)
```
Edit lucid-<name>/plugin/src/ → push to main
  → .github/workflows/publish-embedded.yml
  → Builds all plugins → builds embedded bundle
  → Auto-bumps version if needed
  → Publishes @lucid-fdn/skills-embedded to npm
  → Worker picks up on next deploy (semver ^)
```

### Worker integration (LucidMerged repo)
After a new plugin is published, the worker needs:
1. Register factory in `worker/src/agent/embedded-skill-loader.ts`
2. Seed `plugin_catalog` (SQL migration with tool_manifest)
3. Deploy worker on Railway

### Secrets (GitHub repo settings)
| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Skill import target DB |
| `SUPABASE_SERVICE_ROLE_KEY` | DB write access |
| `NPM_PUBLISH_TOKEN` | Publish to npmjs.org |

## Conventions
- Feature folders: `lucid-<name>`
- Package scope: `@lucid-fdn/<name>`
- One `skill/SKILL.md` per feature = one catalog import entrypoint
- Brain layer tools prefixed: `lucid_think`, `lucid_scan`, etc.
- Tests via vitest, builds via tsup
