# Lucid Foundation Ecosystem Design

> **Status:** Pending approval
> **Date:** 2026-02-23
> **Scope:** Full ecosystem revamp — 23 MCP repos → AgentSkills format + SDK + marketplace

## Goal

Transform 23 existing Lucid MCP repos (~150+ tools) into pure-markdown AgentSkills skill packages published under `lucid.foundation`, with a shared SDK for scaffolding, verification, and cross-platform adapter generation. Zero custom MCPs — all API access via official MCP servers. Position Lucid Foundation as the trusted, verified alternative to ClawHub post-ClawHavoc.

## Context

### What we have
- 6 MCP plugin repos with dual MCP + OpenClaw entry points (~66 tools)
- 17 additional `@raijinlabs` MCP server repos (~90+ tools)
- ~150+ custom tools wrapping APIs across DeFi, business, observability domains
- Domain knowledge encoded in TypeScript code and JSON config
- Framework-agnostic ToolParamDef system with Zod/TypeBox adapters

### What the industry looks like (Feb 2026)
- **AgentSkills** is the universal standard (SKILL.md + YAML frontmatter), adopted by 25+ platforms
- **ClawHub** has 3,286 skills but suffered ClawHavoc (341 malicious skills) — trust is broken
- **MCP** is the tool connectivity standard — official MCPs exist for Sentry, Supabase, GitHub, etc.
- **AAIF** (Linux Foundation) governs both standards

### The opportunity
- No trusted, verified skill registry exists post-ClawHavoc
- No composability standard for multi-skill workflows
- No cross-platform adapter generation (skills locked to one platform)
- Our runtime has better orchestration + enterprise features

## Architecture

```
github.com/lucid-foundation/

  FRAMEWORK (open source, community contributes):
  ├── lucid-sdk/                ← CLI: init, test, verify, adapt, publish
  │   ├── templates/            ← scaffolding for new skills
  │   ├── adapters/             ← platform manifest generators
  │   │   ├── claude-code.ts    ← .claude-plugin/plugin.json
  │   │   ├── openclaw.ts       ← openclaw.plugin.json
  │   │   ├── cursor.ts         ← .cursorrules
  │   │   └── (new platforms)
  │   └── verify/               ← security scanning, lint, testing
  │
  ├── lucid-skill-template/     ← npx create-lucid-skill
  ├── lucid-marketplace/        ← registry index of all lucid-* skills

  LUCID SKILLS — Original 6 (open source, Lucid team authored):
  ├── lucid-observability/      ← 7 skills, observability domain
  ├── lucid-veille/             ← 4 skills, content monitoring
  ├── lucid-compete/            ← 4 skills, competitive intelligence
  ├── lucid-alpha/              ← 4 skills, blockchain analytics
  ├── lucid-metrics/            ← 4 skills, product analytics
  ├── lucid-prospect/           ← 4 skills, sales intelligence

  LUCID SKILLS — DeFi (10 repos, open source):
  ├── lucid-airdrop/            ← airdrop farming, eligibility, claims
  ├── lucid-audit/              ← smart contract security analysis
  ├── lucid-shield/             ← DeFi risk, rug detection, honeypots
  ├── lucid-sniper/             ← token launch intelligence
  ├── lucid-tax/                ← crypto tax & DeFi accounting
  ├── lucid-trade/              ← DEX/CEX trading, DCA, grid, backtest
  ├── lucid-vault/              ← DeFi yield management
  ├── lucid-xbridge/            ← cross-chain bridge routing
  ├── lucid-predict/            ← prediction markets (Polymarket, Kalshi)
  ├── lucid-hype/               ← growth hacking, viral content

  LUCID SKILLS — Business (7 repos, open source):
  ├── lucid-bridge/             ← cross-platform startup ops
  ├── lucid-feedback/           ← sentiment analysis, NPS tracking
  ├── lucid-invoice/            ← smart billing & revenue
  ├── lucid-meet/               ← meeting notes, action items
  ├── lucid-recruit/            ← ATS & hiring pipeline
  ├── lucid-seo/                ← SEO intelligence, SERP analysis
  ├── lucid-propose/            ← RFP & proposal generation

  ZERO CUSTOM MCPs — all use official MCP servers:
  │  Blockchain: Alchemy, Etherscan, Moralis, The Graph, Chainlink
  │  Web scraping: Firecrawl (changeTracking), Playwright (Microsoft)
  │  Enrichment: Hunter.io, ZoomInfo, Apollo.io (all official hosted)
  │  Analytics: PostHog (27 tools), Moonbird (Amplitude/Mixpanel)
  │  Competitive: Similarweb, Semrush (both official)
  │  Content: rss-reader-mcp, Firecrawl
  │  Database: Supabase, PostgreSQL
  │  Monitoring: Sentry (official)

  COMMUNITY SKILLS (open source, community authored):
  ├── lucid-kubernetes-ops/     ← by @community-member
  ├── lucid-aws-incident/       ← by @community-member
  └── ...
```

### What stays closed source
- SaaS runtime (orchestration engine, enterprise features)
- Verification pipeline internals
- lucid.foundation registry backend

### Naming convention
- All skills: `lucid-{domain}` (regardless of author)
- All MCPs: `lucid-{domain}-mcp`
- Framework: `lucid-sdk`, `lucid-skill-template`, `lucid-marketplace`

## Skill Package Format

### Source of truth: `skill.yaml`

```yaml
lucid: "1.0"
name: lucid-observability
version: "4.0.0"
description: "Production observability triage, incident response, and cross-service correlation"
author: "Lucid Foundation"
license: "MIT"

requires:
  mcps: [sentry, supabase]
  env: [SENTRY_AUTH_TOKEN]

skills:
  - triage
  - incident-response
  - correlation
  - billing-health
  - conventions
  - production-readiness
  - alerting

heartbeat: HEARTBEAT.md

platforms:
  claude-code: true
  openclaw: true
  cursor: true
```

### Generated manifests (by `lf adapt`)
- `.claude-plugin/plugin.json` — Claude Code
- `openclaw.plugin.json` — OpenClaw
- `.cursorrules` — Cursor
- Future platforms added as adapter templates in SDK

### SKILL.md format (AgentSkills standard)

```yaml
---
name: triage
description: >
  Triage Sentry issues using pattern matching, temporal analysis,
  and known bug correlation. Requires Sentry MCP.
version: 1.0.0
metadata:
  lucid:
    requires:
      mcps: [sentry]
      env: [SENTRY_AUTH_TOKEN]
    emoji: "magnifying-glass"
---

# Observability Triage

[Full skill content — knowledge, procedures, references]
```

### Directory structure (per plugin)

```
lucid-{domain}/
├── skill.yaml                    ← canonical manifest (source of truth)
├── skills/
│   ├── {skill-name}/
│   │   ├── SKILL.md              ← main skill file (<500 lines)
│   │   └── references/           ← detailed reference material
│   │       └── *.md
│   └── ...
├── HEARTBEAT.md                  ← autonomous monitoring (OpenClaw)
├── .claude-plugin/
│   └── plugin.json               ← GENERATED by lf adapt
├── openclaw.plugin.json          ← GENERATED by lf adapt
├── package.json                  ← npm publishable
├── LICENSE (MIT)
└── README.md
```

## Platform Lock-in Protection

The `skill.yaml` is the insurance policy. SKILL.md files use the AgentSkills open standard (Linux Foundation governed). Platform-specific manifests are generated throwaway glue.

- If Claude Code dies: delete `.claude-plugin/`, add new adapter template to SDK
- If OpenClaw dies: delete `openclaw.plugin.json`, same
- The knowledge (SKILL.md files) is platform-agnostic and durable

## The 6 Plugin Revamps

### 1. lucid-observability (current: lucid-observability-agent, 16 tools)

**Delete**: 14 API-wrapping tools (~3500 lines TypeScript)
**Keep as optional MCP**: `diagnose_issue` pattern matching engine
**Create**: 7 skills

| Skill | Content (migrated from) |
|-------|------------------------|
| `triage` | sentry_list_issues + sentry_get_issue + sentry_get_issue_events + diagnose_issue knowledge + extractStacktrace/extractBreadcrumbs/detectTemporalPattern logic + diagnosisPatterns + knownBugs + severity scoring |
| `incident-response` | generate_runbook (all 10 categories × 5 phases) + incident-response prompt workflow |
| `correlation` | sentry_search_by_trace + cross_correlate logic + services map + dependencies + traceFlow + enrichSentryEvent hint |
| `billing-health` | openmeter_outbox_health SQL + openmeter_usage_by_org SQL + openmeter_dead_letter_retry SQL + openmeter_usage_anomaly algorithm + metering thresholds |
| `conventions` | check_conventions logic + spanNames (20) + attributeKeys (21) + rules (6) + sampling config + PII requirements |
| `production-readiness` | check_config_health checklist + scoring (≥70%, 0 failures) + env var requirements + production-readiness prompt workflow |
| `alerting` | suggest_alert_rules templates (5 rule types) + frequency heuristics + action mapping |

**All thresholds preserved**: queue depth 500, dead letter 10, burst 80%/20%, severity scoring, CV<0.5 steady, 5x gap regression, batch size 6, etc.

**Prerequisites declared**: Official Sentry MCP, Supabase MCP

### 2. lucid-veille (current: Lucid-Veille, 13 tools)

**Delete**: Source management CRUD tools, fetch wrappers
**Maybe keep as MCP**: RSS parsing + web scraping if no generic MCP suffices
**Create**: 4 skills

| Skill | Content |
|-------|---------|
| `content-sourcing` | Source types (RSS, Twitter, Reddit, HN, web), configuration per type, relevance scoring rules |
| `digest-generation` | AI prompting strategies, EN/FR support, digest format templates, daily/weekly cadence |
| `content-publishing` | Per-platform rules (Ghost, WordPress, Twitter, LinkedIn, dev.to, Telegram, Slack, Discord), content transforms (digest→blog, digest→thread, etc.) |
| `content-search` | Search strategies across collected items |

### 3. lucid-compete (current: Lucid-Compete, 13 tools)

**Delete**: Competitor CRUD tools, monitor CRUD, fetch wrappers
**Keep as MCP**: Web-diff snapshot engine (comparing page changes over time)
**Create**: 4 skills

| Skill | Content |
|-------|---------|
| `competitor-tracking` | How to set up monitoring, 12 data source types, configuration per source |
| `signal-detection` | Signal classification taxonomy, severity ranking, detection patterns per source type |
| `battle-cards` | AI battle card generation framework, comparison methodology, narrative structure |
| `intel-briefs` | Intelligence brief format, synthesis methodology, briefing cadence |

### 4. lucid-alpha (current: Lucid-Alpha, 13 tools)

**Delete**: Wallet CRUD tools, basic query wrappers
**Keep as MCP**: Blockchain RPC data provider (no standard MCP for on-chain data)
**Create**: 4 skills

| Skill | Content |
|-------|---------|
| `wallet-tracking` | Whale identification criteria per chain, multi-chain monitoring strategy, transaction classification |
| `signal-analysis` | Accumulation/distribution patterns, smart money behavioral models, signal strength scoring |
| `token-analysis` | Token flow metrics, holder concentration analysis, PnL calculation methodology |
| `copy-trading` | Copy-trade evaluation framework, risk scoring matrix, strategy comparison |

### 5. lucid-metrics (current: Lucid-Metrics, 12 tools)

**Delete**: Event tracking wrappers, basic query tools
**Maybe keep as MCP**: If analytics backend is proprietary (not Postgres)
**Create**: 4 skills

| Skill | Content |
|-------|---------|
| `event-tracking` | Event naming taxonomy, schema standards, tracking plan methodology |
| `funnel-analysis` | Funnel definition templates, cohort retention methodology, drop-off detection rules |
| `experimentation` | A/B test methodology, statistical significance guide, sample size calculations, result interpretation |
| `product-insights` | Standard product KPIs, feature adoption tracking, period-over-period comparison methodology |

### 6. lucid-prospect (current: Lucid-Prospect, 15 tools)

**Delete**: Lead CRUD tools, basic search wrappers
**Keep as MCP**: Email discovery + company enrichment (proprietary APIs)
**Create**: 4 skills

| Skill | Content |
|-------|---------|
| `lead-discovery` | Search strategies, enrichment source comparison, data quality assessment |
| `lead-scoring` | Scoring model (criteria + weights), ICP matching framework, fit scoring methodology |
| `email-outreach` | Email discovery tactics, verification rules, outreach templates, campaign management |
| `sales-intelligence` | Pipeline insights, lead research methodology, competitive positioning |

## The 17 Microservice Revamps

### DeFi Skills (10 repos)

#### lucid-airdrop (current: Lucid-Airdrop)
- **Skills**: eligibility-checking, claim-management, farming-strategies, value-estimation
- **Requires MCPs**: Alchemy, Etherscan, The Graph

#### lucid-audit (current: Lucid-Audit)
- **Skills**: vulnerability-detection, gas-optimization, access-control-review, security-scoring
- **Requires MCPs**: Etherscan, Alchemy

#### lucid-shield (current: Lucid-Shield, 15 tools, 6 providers)
- **Skills**: rug-detection, honeypot-analysis, contract-safety, risk-scoring
- **Requires MCPs**: Etherscan, Alchemy (GoPlus/DeFiLlama via fetch)

#### lucid-sniper (current: Lucid-Sniper)
- **Skills**: launch-detection, token-analysis, entry-timing
- **Requires MCPs**: Alchemy, Moralis, The Graph

#### lucid-tax (current: Lucid-Tax)
- **Skills**: transaction-classification, cost-basis-calculation, tax-reporting, defi-accounting
- **Requires MCPs**: Etherscan, Alchemy, Moralis

#### lucid-trade (current: Lucid-Trade)
- **Skills**: order-execution, position-management, dca-strategies, grid-trading, backtesting, market-analysis, risk-controls
- **Requires MCPs**: Alchemy, Moralis

#### lucid-vault (current: Lucid-Vault)
- **Skills**: yield-strategies, position-tracking, rebalancing, risk-assessment
- **Requires MCPs**: Alchemy, The Graph, DeFiLlama via fetch

#### lucid-xbridge (current: Lucid-XBridge)
- **Skills**: route-optimization, fee-comparison, bridge-security, transaction-monitoring
- **Requires MCPs**: Alchemy, Etherscan (multi-chain)

#### lucid-predict (current: Lucid-Predict)
- **Skills**: probability-analysis, arbitrage-detection, portfolio-tracking, market-methodology
- **Requires MCPs**: Fetch (Polymarket, Manifold, Kalshi APIs)

#### lucid-hype (current: Lucid-Hype)
- **Skills**: content-generation, engagement-optimization, community-growth, influencer-identification
- **Requires MCPs**: Twitter/X MCP, Reddit MCP

### Business Skills (7 repos)

#### lucid-bridge (current: Lucid-Bridge)
- **Skills**: startup-ops, cross-platform-integration, workflow-automation
- **Requires MCPs**: Supabase, Slack MCP

#### lucid-feedback (current: Lucid-Feedback)
- **Skills**: sentiment-analysis, nps-tracking, trend-detection, feedback-synthesis
- **Requires MCPs**: Supabase

#### lucid-invoice (current: Lucid-Invoice)
- **Skills**: billing-generation, revenue-tracking, payment-workflows, pricing-strategies
- **Requires MCPs**: Supabase, Stripe MCP, SendGrid MCP

#### lucid-meet (current: Lucid-Meet)
- **Skills**: note-extraction, action-items, decision-tracking, follow-up-automation
- **Requires MCPs**: Google Calendar MCP, Slack MCP

#### lucid-recruit (current: Lucid-Recruit)
- **Skills**: candidate-scoring, pipeline-management, interview-frameworks, offer-analysis
- **Requires MCPs**: Supabase, SendGrid MCP

#### lucid-seo (current: Lucid-SEO)
- **Skills**: keyword-research, serp-analysis, content-optimization, technical-audit, backlink-strategy
- **Requires MCPs**: Semrush MCP (official), Similarweb MCP (official)

#### lucid-propose (current: Lucid-Propose)
- **Skills**: rfp-analysis, proposal-generation, pricing-strategy, competitive-positioning
- **Requires MCPs**: Supabase

## The SDK (lucid-sdk)

### CLI commands

```bash
# Scaffold
npx create-lucid-skill                 # interactive scaffolding
lf init <name>                         # quick init

# Develop
lf dev                                 # hot-reload in local agent
lf validate                            # lint SKILL.md, check skill.yaml

# Verify (the trust differentiator)
lf verify                              # security scan + dependency audit
lf verify --compatibility              # test across platforms
lf verify --report                     # generate verification report

# Adapt (platform lock-in protection)
lf adapt                               # generate all platform manifests
lf adapt --only claude-code            # just one platform
lf adapt --add newplatform             # register new adapter

# Publish
lf publish                             # push to lucid.foundation registry
lf publish --dry-run                   # preview without publishing
```

### Verification pipeline (the moat)

What `lf verify` checks:
1. **Static analysis**: No executable code in SKILL.md, no suspicious URLs, no credential patterns
2. **Dependency audit**: Required MCPs exist, env vars documented
3. **Format compliance**: AgentSkills spec validation, frontmatter schema
4. **Size check**: SKILL.md < 500 lines, references < 5000 tokens each
5. **Compatibility matrix**: Generate report of which platforms support this skill

### Adapter system

Each platform adapter is a template that reads `skill.yaml` and generates the platform-specific manifest:

```typescript
// adapters/claude-code.ts
export function generateClaudeCodeManifest(skillYaml: SkillYaml): PluginJson {
  return {
    name: skillYaml.name,
    description: skillYaml.description,
    version: skillYaml.version,
    // ... map skills to Claude Code plugin structure
  };
}
```

Adding a new platform = adding one adapter file. Community can contribute adapters.

## Marketing & Traction Strategy

### Phase 1: Launch (ride the ClawHavoc news cycle)

**Narrative**: "ClawHub got 341 malicious skills. We built the trusted alternative."

1. **Blog post**: "Why We Built a Verified Skill Registry After ClawHavoc" (post on HN, dev.to, Twitter)
2. **Launch with 60+ verified skills** across 23 packages covering DeFi, business, observability
3. **Product Hunt launch**: "Lucid Foundation — The trusted registry for AI agent skills"
4. **GitHub stars campaign**: Open source all 6 skill repos + SDK simultaneously

**Targets**: 500 GitHub stars week 1, HN front page, 50 community skill installs

### Phase 2: Developer adoption (PLG)

1. **`npx create-lucid-skill`** — zero-friction scaffolding (like create-next-app)
2. **Verification badge** — "Verified by Lucid Foundation" badge for READMEs
3. **SDK documentation** — comprehensive guides, video tutorials
4. **Community Discord** — skill authors helping each other
5. **First 100 community skills** — run a skill-building hackathon

**Targets**: 100 community skills, 1000 SDK installs, 50 active contributors

### Phase 3: Composability (the long-term moat)

1. **Propose composability extensions** to AgentSkills spec:
   - `depends: [lucid-observability.triage]` — skill dependencies
   - `provides: [diagnosis-result]` — output contracts
   - `chain: [triage → correlate → runbook]` — workflow definitions
2. **Submit to AAIF** for standardization
3. **Reference implementation** in our runtime (skills compose better on Lucid)
4. **Showcase workflows** — "Install our incident-response workflow, it auto-pulls 3 skills"

**Targets**: Spec proposal accepted by AAIF, 3+ platforms adopt composability

### Phase 4: Monetization

1. **Free tier**: Publish unlimited open-source skills
2. **Pro tier** ($29/mo): Private skills, advanced verification, priority support
3. **Enterprise tier** (custom): SSO, audit logs, RBAC, SLA, custom verification rules
4. **Marketplace cut**: 15% on paid skills (authors set price)

### Content calendar (first 4 weeks)

| Week | Content | Channel |
|------|---------|---------|
| 1 | "Why Verified Skills Matter After ClawHavoc" | Blog, HN, Twitter |
| 1 | Product Hunt launch | PH |
| 1 | Open source all repos | GitHub |
| 2 | "Building Your First Lucid Skill in 5 Minutes" | Tutorial, YouTube |
| 2 | "AgentSkills vs MCP: When to Use Which" | Blog, dev.to |
| 3 | "The Composability Problem in AI Agent Skills" | Blog, HN |
| 3 | Skill-building hackathon announcement | Discord, Twitter |
| 4 | "How We Migrated 150+ MCP Tools to 60+ Pure-Knowledge Skills" | Blog, HN |

## What gets deleted

### Across all 23 repos
- All TypeScript tool implementations wrapping existing APIs
- Zod/TypeBox adapters (replaced by `lf adapt`)
- MCP entry points, OpenClaw entry points, CLI entry points
- Config loaders, helpers, response formatters
- Build tooling (tsup, tsconfig for tool code)
- All `src/` directories (entire codebase)

### What stays as code
**Nothing.** Zero custom MCPs. Every API we were wrapping has an official MCP:

| Our custom code | Replaced by official MCP |
|---|---|
| Sentry API wrapper (6 tools) | Sentry MCP (official) |
| Postgres/OpenMeter queries (4 tools) | Supabase MCP (official) |
| Diagnosis pattern engine | LLM reasoning + skill knowledge |
| Blockchain RPC calls | Alchemy, Etherscan, Moralis, The Graph, Chainlink MCPs (all official) |
| Web-diff snapshots | Firecrawl MCP (official, has changeTracking) |
| Email discovery/enrichment | Hunter.io, ZoomInfo MCPs (official hosted) |
| Product analytics queries | PostHog MCP (official, 27 tools) |
| Competitive intelligence | Similarweb, Semrush MCPs (both official) |
| RSS/content fetching | rss-reader-mcp (community, well-maintained) |
| Smart contract analysis | Etherscan + Alchemy MCPs |
| DeFi risk data | GoPlus, DeFiLlama APIs via fetch |

### Total reduction
- **Before**: 23 repos, ~150+ tools, tens of thousands of lines TypeScript
- **After**: 23 skill packages (pure markdown), 0 custom MCPs, ~60+ skills, 1 SDK

## Migration order

### Phase A: Foundation
1. **lucid-sdk** — build the CLI first so all migrations use it
2. **lucid-skill-template** — `npx create-lucid-skill` scaffolding

### Phase B: Flagship (prove the pattern)
3. **lucid-observability** — most domain knowledge, best showcase
4. **lucid-veille** — already well-structured, good second example

### Phase C: Original 6 (use SDK)
5. **lucid-compete**
6. **lucid-alpha**
7. **lucid-metrics**
8. **lucid-prospect**

### Phase D: DeFi skills (batch, use SDK)
9-18. **lucid-airdrop, lucid-audit, lucid-shield, lucid-sniper, lucid-tax, lucid-trade, lucid-vault, lucid-xbridge, lucid-predict, lucid-hype**

### Phase E: Business skills (batch, use SDK)
19-25. **lucid-bridge, lucid-feedback, lucid-invoice, lucid-meet, lucid-recruit, lucid-seo, lucid-propose**

### Phase F: Launch
26. **lucid-marketplace** — registry with all ~60+ skills across 23 packages
27. Marketing push (blog, PH, HN)

## Success criteria

- [ ] All ~60+ skills pass `lf verify`
- [ ] All 23 plugins work on Claude Code AND OpenClaw (cross-platform)
- [ ] Zero TypeScript in skill packages (pure markdown)
- [ ] Every piece of domain knowledge from all 23 repos preserved
- [ ] SDK scaffolds a new skill in <30 seconds
- [ ] 500+ GitHub stars across all repos within first month
- [ ] First community skill published within first week
- [ ] 23 skill packages published to npm + listed on lucid.foundation
