# @raijinlabs/compete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `@raijinlabs/compete`, a competitive intelligence MCP server + OpenClaw plugin with 12 fetchers, 13 tools, AI-powered battle cards and intel briefs, and real-time alerts.

**Architecture:** Single package with `src/core/` (all business logic), dual entry points (MCP + OpenClaw), framework-agnostic tool definitions with Zod/TypeBox adapters. Same proven pattern as `@raijinlabs/veille`.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, Zod, TypeBox, Supabase, Vitest, tsup, Bottleneck, croner, rss-parser, cheerio, twitter-api-v2

---

### Task 1: Scaffold project

Create the project structure, package.json, and all config files.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `.prettierrc`

**Step 1: Create package.json**

```json
{
  "name": "@raijinlabs/compete",
  "version": "1.0.0",
  "description": "Competitive intelligence monitoring, AI battle cards, and real-time alerts — OpenClaw plugin + MCP server",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "compete-mcp": "./dist/bin.js"
  },
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./mcp": { "import": "./dist/mcp.js", "types": "./dist/mcp.d.ts" },
    "./core": { "import": "./dist/core/index.js", "types": "./dist/core/index.d.ts" }
  },
  "files": ["dist", "openclaw.plugin.json", "skills", "migrations"],
  "publishConfig": { "access": "public" },
  "repository": { "type": "git", "url": "https://github.com/raijinlabs/lucid-compete.git" },
  "keywords": ["openclaw", "mcp", "plugin", "competitive-intelligence", "battle-cards", "monitoring", "ai"],
  "author": "RaijinLabs",
  "openclaw": { "extensions": ["./src/index.ts"] },
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/ test/ --ext .ts",
    "lint:fix": "eslint src/ test/ --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"test/**/*.ts\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "@mozilla/readability": "^0.5.0",
    "@sinclair/typebox": "^0.32.0",
    "@supabase/supabase-js": "^2.45.0",
    "bottleneck": "^2.19.5",
    "cheerio": "^1.0.0",
    "croner": "^8.1.0",
    "jsdom": "^24.1.0",
    "marked": "^12.0.0",
    "rss-parser": "^3.13.0",
    "twitter-api-v2": "^1.17.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/jsdom": "^21.1.7",
    "@types/node": "^20.14.0",
    "@vitest/coverage-v8": "^1.6.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.13.0",
    "@typescript-eslint/parser": "^7.13.0",
    "prettier": "^3.3.0",
    "tsup": "^8.1.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  },
  "engines": { "node": ">=18.0.0" },
  "license": "MIT"
}
```

**Step 2: Create tsconfig.json, tsup.config.ts, vitest.config.ts, .gitignore, .env.example, .prettierrc**

Copy the exact same configs from `C:\Lucid-Veille` — they use the same structure. tsup has multi-entry: `['src/index.ts', 'src/mcp.ts', 'src/openclaw.ts', 'src/bin.ts', 'src/core/index.ts']`.

**Step 3: npm install**

Run: `cd /c/Lucid-Compete && npm install`

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold @raijinlabs/compete project"
```

---

### Task 2: Type definitions

Create all TypeScript type definitions for the compete domain.

**Files:**
- Create: `src/core/types/common.ts`
- Create: `src/core/types/config.ts`
- Create: `src/core/types/database.ts`
- Create: `src/core/types/fetcher.ts`
- Create: `src/core/types/analysis.ts`
- Create: `src/core/types/alerts.ts`
- Create: `src/core/types/index.ts`

**Key types to define:**

`common.ts` — Enums:
```typescript
export type MonitorType = 'web-diff' | 'github' | 'rss' | 'jobs' | 'npm' | 'twitter' | 'reddit' | 'producthunt' | 'g2' | 'crunchbase' | 'linkedin' | 'hackernews';
export type SignalType = 'pricing_change' | 'feature_launch' | 'funding_round' | 'new_hire' | 'job_posting' | 'release' | 'review' | 'social_mention' | 'news' | 'content_change' | 'other';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type BriefType = 'weekly' | 'monthly';
export type NotifierType = 'slack' | 'webhook' | 'email';
export type AlertStatus = 'pending' | 'sent' | 'failed';
```

`config.ts` — PluginConfig interface with all config fields from the design doc.

`database.ts` — Entity types: `Competitor`, `CompetitorInsert`, `Monitor`, `MonitorInsert`, `Signal`, `SignalInsert`, `Battlecard`, `BattlecardInsert`, `Brief`, `BriefInsert`, `AlertLog`, `AlertLogInsert`.

`fetcher.ts` — `Fetcher`, `FetchResult` (returns `SignalInsert[]` instead of veille's `ItemInsert[]`).

`analysis.ts` — `BattlecardPromptData`, `BriefPromptData` (systemPrompt + userPrompt).

`alerts.ts` — `Notifier`, `AlertPayload` interfaces.

**Commit:**
```bash
git add -A && git commit -m "feat: add all type definitions"
```

---

### Task 3: Utilities

Create all shared utility modules. These are very similar to veille's utils.

**Files:**
- Create: `src/core/utils/errors.ts` — `FetchError`, `DatabaseError`, `ConfigError`, `AlertError`
- Create: `src/core/utils/logger.ts` — `log.info/warn/error/debug` with `[compete]` prefix
- Create: `src/core/utils/retry.ts` — `withRetry()` with exponential backoff
- Create: `src/core/utils/url.ts` — URL normalization, domain extraction
- Create: `src/core/utils/text.ts` — `truncate`, `stripHtml`, `slugify`
- Create: `src/core/utils/date.ts` — `toISODate`, `daysAgo`, `formatRelative`
- Create: `src/core/utils/hash.ts` — `contentHash(text): string` using SHA-256 for change detection
- Create: `src/core/utils/index.ts` — barrel export
- Create: `src/core/plugin-id.ts` — `PLUGIN_ID = 'lucid-compete'`, `PLUGIN_NAME = 'Lucid Compete'`, `PLUGIN_VERSION = '1.0.0'`
- Test: `test/unit/utils/hash.test.ts`
- Test: `test/unit/utils/text.test.ts`

**Commit:**
```bash
git add -A && git commit -m "feat: add utility modules"
```

---

### Task 4: Config

Create config schema, defaults, and loader.

**Files:**
- Create: `src/core/config/schema.ts` — TypeBox schema for all config fields
- Create: `src/core/config/defaults.ts` — Default values
- Create: `src/core/config/loader.ts` — `loadConfig(raw)`, `getConfig()`, `resetConfig()`. Priority: raw > env > defaults. Env vars prefixed with `COMPETE_`.
- Create: `src/core/config/index.ts` — barrel export
- Test: `test/unit/config/loader.test.ts`

**Commit:**
```bash
git add -A && git commit -m "feat: add config schema and loader"
```

---

### Task 5: Database layer + SQL migrations

Create the Supabase client singleton and all CRUD modules.

**Files:**
- Create: `src/core/db/client.ts` — `initSupabase()`, `getSupabase()`, `resetSupabase()` (identical to veille)
- Create: `src/core/db/competitors.ts` — `createCompetitor`, `getCompetitor`, `listCompetitors`, `updateCompetitor`, `deleteCompetitor`
- Create: `src/core/db/monitors.ts` — `createMonitor`, `getMonitor`, `listMonitors`, `updateMonitor`, `deleteMonitor`, `updateMonitorFetchStatus`
- Create: `src/core/db/signals.ts` — `createSignal`, `createSignals` (batch), `listSignals` (with filters: competitor_id, severity, signal_type, date range), `searchSignals` (FTS), `getSignalCountByCompetitor`
- Create: `src/core/db/battlecards.ts` — `createBattlecard`, `getLatestBattlecard(competitorId)`, `listBattlecards`
- Create: `src/core/db/briefs.ts` — `createBrief`, `getLatestBrief(type)`, `listBriefs`
- Create: `src/core/db/alert-log.ts` — `createAlertLog`, `updateAlertLog`, `listAlertLogs`
- Create: `src/core/db/index.ts` — barrel export
- Create: `migrations/001_compete_schema.sql` — All tables from the design doc (competitors, monitors, signals, battlecards, briefs)
- Create: `migrations/002_alerts.sql` — alert_log table
- Create: `test/setup.ts` — Vitest setup file (env vars, mock helpers)

**Commit:**
```bash
git add -A && git commit -m "feat: add database layer and SQL migrations"
```

---

### Task 6: Tool types + schema adapters

Copy the proven adapter pattern from veille.

**Files:**
- Create: `src/core/tools/types.ts` — `ToolParamDef`, `ToolDefinition` (identical to veille)
- Create: `src/adapters/zod-schema.ts` — `toZodSchema()` (identical to veille)
- Create: `src/adapters/typebox-schema.ts` — `toTypeBoxSchema()` (identical to veille)
- Create: `src/adapters/index.ts`
- Test: `test/unit/adapters/zod-schema.test.ts` (copy from veille)
- Test: `test/unit/adapters/typebox-schema.test.ts` (copy from veille)

Run tests: `npx vitest run test/unit/adapters/`

**Commit:**
```bash
git add -A && git commit -m "feat: add tool types and schema adapters"
```

---

### Task 7: Base fetcher + rate limiter

Create the fetcher foundation.

**Files:**
- Create: `src/core/fetchers/rate-limiter.ts` — Per-source Bottleneck instances
- Create: `src/core/fetchers/base.ts` — `BaseFetcher` abstract class with rate limiting and retry. Same pattern as veille but returns `SignalInsert[]` instead of `ItemInsert[]`.

```typescript
export abstract class BaseFetcher implements Fetcher {
  abstract readonly monitorType: MonitorType;
  abstract readonly name: string;

  abstract isConfigured(): boolean;
  protected abstract doFetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult>;

  async fetch(monitor: Monitor, competitor: Competitor): Promise<FetchResult> {
    const limiter = getRateLimiter(this.monitorType);
    return limiter.schedule(async () => {
      return await withRetry(() => this.doFetch(monitor, competitor), { maxAttempts: 2 });
    });
  }
}
```

Note: The compete fetcher interface differs from veille in that `fetch()` takes both a `Monitor` and its parent `Competitor` (for context like competitor name, website).

**Commit:**
```bash
git add -A && git commit -m "feat: add base fetcher with rate limiting"
```

---

### Task 8: Core fetchers (web-diff, github, rss, npm, jobs)

The 5 highest-value fetchers.

**Files:**
- Create: `src/core/fetchers/web-diff.ts` — Fetch page, extract text via Readability, hash, compare against `last_content_hash`, emit `content_change` or `pricing_change` signal if changed. Uses cheerio + jsdom.
- Create: `src/core/fetchers/github.ts` — GitHub REST API. Check releases (new → `release` signal), star count (store in metadata), README hash changes (→ `content_change`). Config: `{ owner, repo }` parsed from GitHub URL.
- Create: `src/core/fetchers/rss.ts` — RSS/Atom via rss-parser. Each new item → `news` signal. Dedup by item URL.
- Create: `src/core/fetchers/npm.ts` — Fetch `registry.npmjs.org/{package}`. Compare latest version against last known. New version → `release` signal. Download trends via `api.npmjs.org/downloads`.
- Create: `src/core/fetchers/jobs.ts` — Fetch Greenhouse (`boards-api.greenhouse.io/v1/boards/{company}/jobs`), Lever (`api.lever.co/v0/postings/{company}`), Ashby (`jobs.ashbyhq.com/api/non-user-graphql`). New postings → `job_posting` signals. Parse department/team from job data.
- Test: `test/unit/fetchers/web-diff.test.ts` — Mock fetch, test change detection and hash comparison
- Test: `test/unit/fetchers/github.test.ts` — Mock GitHub API responses
- Test: `test/unit/fetchers/rss.test.ts` — Mock RSS feed parsing

**Commit:**
```bash
git add -A && git commit -m "feat: add core fetchers (web-diff, github, rss, npm, jobs)"
```

---

### Task 9: Social/community fetchers (twitter, reddit, hackernews, producthunt, linkedin)

**Files:**
- Create: `src/core/fetchers/twitter.ts` — Uses twitter-api-v2. Search recent tweets by query or user timeline. New tweets → `social_mention` signals.
- Create: `src/core/fetchers/reddit.ts` — Reddit JSON API (`reddit.com/search.json?q={query}&sort=new`). New posts → `social_mention` signals. No auth needed.
- Create: `src/core/fetchers/hackernews.ts` — HN Algolia API (`hn.algolia.com/api/v1/search_by_date?query={query}`). New stories/comments → `social_mention` signals.
- Create: `src/core/fetchers/producthunt.ts` — Product Hunt RSS feed (`producthunt.com/feed`). Filter for competitor mentions. Launches → `feature_launch` signals.
- Create: `src/core/fetchers/linkedin.ts` — RSSHub proxy (`rsshub.app/linkedin/company/{companyId}`). New posts → `social_mention` signals. Falls back gracefully if RSSHub unavailable.

**Commit:**
```bash
git add -A && git commit -m "feat: add social/community fetchers"
```

---

### Task 10: Review/funding fetchers + fetcher registry

**Files:**
- Create: `src/core/fetchers/g2.ts` — Scrape G2 competitor profile pages. Extract reviews from HTML (JSON-LD `@type: Review` data if available, fallback to cheerio parsing). New reviews → `review` signals with rating and text.
- Create: `src/core/fetchers/crunchbase.ts` — Crunchbase Basic API or RSS (`news.crunchbase.com/feed/`). Filter for competitor mentions. Funding rounds → `funding_round` signals.
- Create: `src/core/fetchers/index.ts` — `createFetcherRegistry(config): Map<MonitorType, Fetcher>`. Instantiate all 12 fetchers, register only configured ones.

**Commit:**
```bash
git add -A && git commit -m "feat: add review/funding fetchers and registry"
```

---

### Task 11: Analysis layer

Signal classification, battle card building, and intel brief building.

**Files:**
- Create: `src/core/analysis/signal-classifier.ts` — `classifySignal(signal: SignalInsert): Severity`. Rules-based:
  - `pricing_change` → critical
  - `funding_round` with amount > $10M → critical, else high
  - `feature_launch` → high
  - `release` with major version bump → high, else medium
  - `job_posting` with "VP" or "Director" in title → high, else medium
  - `review` → medium
  - `social_mention` → low
  - `content_change` on pricing URL → critical, else medium
- Create: `src/core/analysis/prompts.ts` — Prompt templates for battle cards and briefs. System prompts establishing the CI analyst persona.
- Create: `src/core/analysis/battlecard-builder.ts` — `buildBattlecard(competitor, signals, config): BattlecardPromptData`. Groups signals by type, builds structured prompt sections (overview, recent moves, strengths, weaknesses, pricing, talk tracks).
- Create: `src/core/analysis/brief-builder.ts` — `buildBrief(competitors, signals, config): BriefPromptData`. Ranks signals by severity across all competitors, builds executive summary prompt.
- Create: `src/core/analysis/index.ts` — barrel export
- Test: `test/unit/analysis/signal-classifier.test.ts` — Test all classification rules
- Test: `test/unit/analysis/battlecard-builder.test.ts` — Test prompt structure

**Commit:**
```bash
git add -A && git commit -m "feat: add analysis layer (classifier, battlecard, brief builders)"
```

---

### Task 12: Alerts

Notification system for high-priority signals.

**Files:**
- Create: `src/core/alerts/base.ts` — `BaseNotifier` abstract class and `Notifier` interface
- Create: `src/core/alerts/slack.ts` — Slack incoming webhook. Format signal as Slack Block Kit message.
- Create: `src/core/alerts/webhook.ts` — Generic HTTP POST with JSON payload. Include HMAC signature header.
- Create: `src/core/alerts/email.ts` — SMTP email via nodemailer or raw SMTP. Format signal as HTML email.
- Create: `src/core/alerts/index.ts` — `createNotifierRegistry(config): Map<NotifierType, Notifier>`. Register only configured notifiers.
- Test: `test/unit/alerts/slack.test.ts` — Mock fetch, test Slack payload format

Note: For email, use raw `net.createConnection` SMTP or a minimal SMTP helper to avoid adding nodemailer as a dep. Or make email support opt-in by checking if nodemailer is installed. Simplest approach: just use `fetch()` to call an email API like Mailgun/SendGrid if configured, or skip email for MVP and just do Slack + webhook.

**Commit:**
```bash
git add -A && git commit -m "feat: add alert notifiers (slack, webhook, email)"
```

---

### Task 13: Tools — competitor management

4 tools for managing competitors.

**Files:**
- Create: `src/core/tools/manage-competitors.ts` — Factory functions:
  - `createAddCompetitorTool(deps)` — Add competitor. Calls auto-discovery to probe for monitors.
  - `createListCompetitorsTool(deps)` — List all competitors with signal/monitor counts.
  - `createUpdateCompetitorTool(deps)` — Update name, website, description, industry.
  - `createRemoveCompetitorTool(deps)` — Delete competitor (cascade).

Auto-discovery logic in `compete_add_competitor`:
1. Probe `{website}/pricing` → add web-diff monitor
2. Probe `{website}/changelog` or `{website}/blog` for RSS → add rss monitor
3. Search GitHub for org → add github monitor(s)
4. Search npm → add npm monitor(s)
5. Check Greenhouse/Lever/Ashby → add jobs monitor
6. Return list of auto-created monitors

All tools use `ToolDefinition` return type with `ToolParamDef` params.

**Commit:**
```bash
git add -A && git commit -m "feat: add competitor management tools"
```

---

### Task 14: Tools — monitors, fetch, signals, search, status

7 more tools.

**Files:**
- Create: `src/core/tools/manage-monitors.ts` — `createAddMonitorTool`, `createListMonitorsTool`, `createRemoveMonitorTool`
- Create: `src/core/tools/fetch-now.ts` — `createFetchNowTool`. Accepts optional `competitor_id` or `monitor_id`. Fetches, classifies signals, triggers alerts for high/critical.
- Create: `src/core/tools/list-signals.ts` — `createListSignalsTool`. Filters: competitor_id, severity, signal_type, limit, days_back.
- Create: `src/core/tools/search.ts` — `createSearchTool`. Full-text search via Supabase FTS.
- Create: `src/core/tools/status.ts` — `createStatusTool`. Returns competitor count, monitor count, signal count (by severity), last fetch time, schedule config.

**Commit:**
```bash
git add -A && git commit -m "feat: add monitor, fetch, signal, search, and status tools"
```

---

### Task 15: Tools — generate battlecard + brief + tools index

The AI-powered output tools plus the tools barrel.

**Files:**
- Create: `src/core/tools/generate-battlecard.ts` — `createGenerateBattlecardTool`. Takes competitor_id, gathers signals, calls battlecard builder, returns prompt data as JSON string.
- Create: `src/core/tools/generate-brief.ts` — `createGenerateBriefTool`. Takes brief_type (weekly/monthly) and optional date, gathers cross-competitor signals, calls brief builder, returns prompt data as JSON string.
- Create: `src/core/tools/index.ts` — `createAllTools(deps): ToolDefinition[]` returning all 13 tools. Also re-export all factory functions and types.

**Commit:**
```bash
git add -A && git commit -m "feat: add battlecard/brief generation tools and tools index"
```

---

### Task 16: Services (scheduler)

Background scheduler for automated fetching and briefing.

**Files:**
- Create: `src/core/services/compete-scheduler.ts` — Uses croner for 2 cron jobs:
  1. Fetch job (`COMPETE_FETCH_SCHEDULE`, default every 6h): fetch all enabled monitors, classify signals, trigger alerts
  2. Brief job (`COMPETE_BRIEF_SCHEDULE`, default Monday 9AM): generate weekly brief
- Create: `src/core/services/index.ts` — `startScheduler(opts)`, `stopScheduler()`

**Commit:**
```bash
git add -A && git commit -m "feat: add background scheduler service"
```

---

### Task 17: Entry points + core barrel

Create all entry points (MCP, OpenClaw, CLI, index) and the core barrel export.

**Files:**
- Create: `src/core/index.ts` — Barrel export of all core modules
- Create: `src/openclaw.ts` — OpenClaw plugin entry point. `export default function register(api)`. Uses TypeBox adapter. Registers 13 tools, scheduler service.
- Create: `src/mcp.ts` — MCP server entry point. `export function createCompeteServer(env)`. Uses Zod adapter. Registers 13 tools via McpServer.
- Create: `src/bin.ts` — CLI binary. `#!/usr/bin/env node`. Creates server + stdio transport.
- Create: `src/index.ts` — `export { default } from './openclaw.js'`

Run: `npm run typecheck` — should pass
Run: `npm run build` — should produce all 5 entry point files in dist/

**Commit:**
```bash
git add -A && git commit -m "feat: add entry points (MCP, OpenClaw, CLI)"
```

---

### Task 18: Tests

Create test setup, unit tests, integration tests, and e2e smoke test.

**Files:**
- Create: `test/setup.ts` — Global test setup (env vars, vi.mock patterns)
- Create: `test/helpers/fixtures.ts` — Test fixtures for competitors, monitors, signals
- Create: `test/helpers/mocks.ts` — Reusable mock factories for Supabase, fetch, etc.
- Create: `test/unit/utils/hash.test.ts` — contentHash tests
- Create: `test/unit/utils/text.test.ts` — truncate, stripHtml tests
- Create: `test/unit/config/loader.test.ts` — Config loading with env var fallback
- Create: `test/unit/analysis/signal-classifier.test.ts` — All classification rules
- Create: `test/unit/analysis/battlecard-builder.test.ts` — Prompt structure
- Create: `test/unit/fetchers/web-diff.test.ts` — Change detection
- Create: `test/unit/fetchers/github.test.ts` — GitHub API parsing
- Create: `test/unit/fetchers/rss.test.ts` — RSS feed parsing
- Create: `test/unit/alerts/slack.test.ts` — Slack payload format
- Create: `test/unit/adapters/zod-schema.test.ts` — Zod adapter
- Create: `test/unit/adapters/typebox-schema.test.ts` — TypeBox adapter
- Create: `test/unit/mcp/server.test.ts` — MCP server creates with 13 tools
- Create: `test/integration/tool-registration.test.ts` — All 13 tools register correctly
- Create: `test/integration/fetch-pipeline.test.ts` — Fetch → classify → store
- Create: `test/e2e/smoke.test.ts` — Plugin register() works, 13 tools available

Run: `npm run test` — all tests should pass
Run: `npm run typecheck` — 0 errors

**Commit:**
```bash
git add -A && git commit -m "test: add unit, integration, and e2e tests"
```

---

### Task 19: Documentation

README, architecture doc, plugin manifest, skill file.

**Files:**
- Create: `README.md` — Feature overview, MCP usage (Claude Desktop config), OpenClaw usage, config reference, tools table, database setup, development commands
- Create: `docs/architecture.md` — Dual entry point design, data model, fetcher registry, analysis pipeline, alert flow
- Create: `openclaw.plugin.json` — Plugin manifest with configSchema and uiHints for all config fields
- Create: `skills/lucid-compete/SKILL.md` — OpenClaw skill file describing what the plugin does

**Commit:**
```bash
git add -A && git commit -m "docs: add README, architecture, plugin manifest, and skill file"
```

---

### Task 20: Final verification

**Step 1: Full suite**

Run: `npm run typecheck && npm run test && npm run build`
Expected: 0 errors, all tests pass, clean build

**Step 2: Verify MCP binary**

Run:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/bin.js 2>/dev/null | head -1
```
Expected: JSON response with `"name":"Lucid Compete"` and `"tools"` capability

**Step 3: Final commit**

```bash
git add -A && git commit -m "feat: @raijinlabs/compete v1.0.0

Competitive intelligence MCP server + OpenClaw plugin:
- 12 fetchers: web-diff, github, rss, jobs, npm, twitter, reddit, producthunt, g2, crunchbase, linkedin, hackernews
- 13 tools for competitor management, monitoring, signals, battle cards, intel briefs
- Real-time alerts via Slack, webhook, email
- Dual entry point: npx @raijinlabs/compete (MCP) or npm install (OpenClaw)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
