# lucid-skills

## What This Is
Open-source monorepo of AI agent plugins for the Lucid platform. Each plugin is a self-contained MCP server with domain knowledge, runtime tools, and tests.

## Quick Start
```bash
npm install
bash scripts/validate-plugin-structure.sh
```

## Structure
```
skills/                       # Pure markdown — model behavior, knowledge, workflow guidance
  lucid-trade/
    SKILL.md                  # Catalog import entrypoint
    references/               # Detailed sub-area docs

plugins/                      # TypeScript MCP servers — runtime tools, executable code
  lucid-trade/              # Crypto trading intelligence (brain layer, 5 tools)
  lucid-audit/              # Smart contract security (brain layer, 5 tools)
  lucid-seo/                # SEO intelligence
  lucid-predict/            # Prediction markets (brain layer)
  lucid-tax/                # Crypto tax compliance (brain layer)
  lucid-observability/      # Production monitoring (brain layer)
  lucid-quantum/            # Quantum key search (brain layer, 9 tools)
  lucid-veille/             # Content monitoring + auto-publishing
  lucid-compete/            # Competitive intelligence
  lucid-hype/               # Growth hacking / social
  lucid-prospect/           # Sales prospecting
  lucid-recruit/            # ATS / hiring
  lucid-propose/            # RFP / proposal engine
  lucid-bridge/             # Startup ops (Notion/Linear/Slack/GitHub)
  lucid-meet/               # Meeting intelligence
  lucid-invoice/            # Billing / revenue
  lucid-metrics/            # Product analytics
  lucid-feedback/           # Customer feedback/NPS
  lucid-video/              # Video generation
  lucid-defi/               # DeFi protocols (docs-only, no MCP server)

packages/
  embedded/                 # @lucid-fdn/skills-embedded — bundled MCP factories
  web3-operator/            # @lucid-fdn/web3-operator — 12 web3 tools
  web3-types/               # @lucid-fdn/web3-types — TypeScript interfaces
  agent-tools-core/         # @lucid-fdn/agent-tools-core — tool metadata

templates/
  plugin-template/          # Starter for new plugins

scripts/
  validate-plugin-structure.sh
  merge-skills-into-plugins.sh
```

## Separation of Concerns
```
skills/lucid-trade/           # Knowledge layer (pure markdown, no code)
  SKILL.md                    # Compact skill prompt (importable to catalog)
  references/                 # Detailed sub-area docs

plugins/lucid-trade/          # Runtime layer (TypeScript, executable)
  package.json                # @lucid-fdn/trade
  plugin.json                 # Lucid metadata (type, category, brainLayer)
  README.md
  src/
    index.ts                  # Barrel export
    mcp.ts                    # createXxxServer() factory
    brain/                    # Brain layer (optional): types, analysis, tools, formatter
    tools/                    # Granular tools
  test/
```

A plugin can reference its matching skill, but it does not own it.
Skills are edited independently — no build step, no TypeScript.

## Plugin Types
- **runtime**: Has `src/`, builds an MCP server, bundled into `@lucid-fdn/skills-embedded`
- **docs-only**: No `src/`, only `docs/` with domain knowledge (e.g., lucid-defi)

## Brain Layer Pattern
Standardized AI reasoning layer in `src/brain/`:
- `types.ts` — Verdict enums (BUY/SELL, SAFE/CRITICAL), structured result types
- `analysis.ts` — Core analysis logic
- `tools.ts` — `createBrainTools()` → MCP tool definitions
- `formatter.ts` — Result → human-readable output

Plugins with brain layer: trade, audit, tax, predict, observability, quantum

## Embedded Bundle
`packages/embedded/` — `@lucid-fdn/skills-embedded`
- Re-exports all MCP server factories (`createXxxServer()`)
- tsup bundles into single ESM file
- Used by worker for in-process execution via InMemoryTransport
- Build: `cd packages/embedded && npm run build`

## Creating a New Plugin
1. Copy `templates/plugin-template/` to `plugins/lucid-<name>/`
2. Replace all `PLUGIN_NAME` / `PLUGIN_DESCRIPTION` placeholders
3. Add tools in `src/mcp.ts`
4. Add domain knowledge in `docs/SKILL.md` and `docs/references/`
5. Register in `packages/embedded/src/index.ts`
6. Run `bash scripts/validate-plugin-structure.sh`

## Conventions
- Package scope: `@lucid-fdn/<name>` (e.g., `@lucid-fdn/trade`)
- Folder names: `lucid-<name>` (e.g., `lucid-trade`)
- One `docs/SKILL.md` per plugin = one catalog import entrypoint
- Brain layer tools prefixed: `lucid_think`, `lucid_scan`, `lucid_protect`, etc.
- Tests via vitest, builds via tsup

## Remote
`github.com/lucid-fdn/lucid-skills.git` — branch: main
