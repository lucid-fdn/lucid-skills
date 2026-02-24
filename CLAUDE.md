# lucid-skills

## What This Is
Open-source monorepo of AgentSkills plugins for the Lucid AI platform. Each plugin is a self-contained domain knowledge package that AI agents can use to gain expertise in specific areas.

## Quick Start
```bash
npm install               # Install workspace deps
bash scripts/validate-all.sh  # Validate all plugins
```

## Structure
```
skills/
  lucid-audit/            # Smart contract security
  lucid-bridge/           # Startup ops integration (Notion/Linear/Slack/GitHub)
  lucid-compete/          # Competitive intelligence
  lucid-defi/             # DeFi protocols
  lucid-feedback/         # Customer feedback/NPS/CSAT
  lucid-hype/             # Growth hacking / social promotion
  lucid-invoice/          # Billing / revenue management
  lucid-meet/             # Meeting intelligence
  lucid-metrics/          # Product analytics
  lucid-observability/    # Production monitoring (Sentry, OTel) — 7 sub-skills
  lucid-predict/          # Prediction markets (Polymarket, Manifold) v5.0
  lucid-propose/          # RFP / proposal engine
  lucid-prospect/         # Sales prospecting / lead discovery
  lucid-recruit/          # ATS / hiring pipeline
  lucid-seo/              # SEO intelligence
  lucid-tax/              # Crypto tax compliance
  lucid-trade/            # Crypto trading intelligence v5.0 — 7 sub-skills
  lucid-veille/           # Content monitoring + auto-publishing v4.0
templates/
  skill-template/         # Starter for new plugins
scripts/
  validate-all.sh         # Lint YAML/JSON + structure check
```

## Plugin Formats
Two formats coexist:
- **Pure AgentSkills** (lucid-trade, lucid-predict, lucid-observability, lucid-defi): `skill.yaml` + `skills/*/SKILL.md` + `openclaw.plugin.json` + `HEARTBEAT.md`
- **TypeScript Skills** (lucid-audit, lucid-veille, etc.): `src/` + `tsconfig.json` + `tsup.config.ts` + `vitest.config.ts` + `skills/`

Both formats include a `package.json` and `skills/` directory with domain knowledge.

## Conventions
- Each `skills/<name>/` is an independent npm-publishable package
- Scope: `@lucid-skills/<name>` (e.g., `@lucid-skills/trade`)
- Pure markdown skills have zero runtime dependencies
- TypeScript skills use tsup for bundling, vitest for testing
- YAML front matter in SKILL.md files for metadata

## Creating a New Plugin
1. Copy `templates/skill-template/` to `skills/lucid-<name>/`
2. Replace all `SKILL_NAME` / `SKILL_DESCRIPTION` placeholders
3. Add domain knowledge to `skills/<name>/references/`
4. Run `bash scripts/validate-all.sh` to verify

## License
MIT — see LICENSE

## Remote
`github.com/raijinlabs/lucid-skills.git` — branch: main
