# @raijinlabs/compete — Design Document

**Date:** 2026-02-21
**Status:** Approved
**Author:** RaijinLabs

## Goal

Build `@raijinlabs/compete`, a competitive intelligence tool that works as both an MCP server and OpenClaw plugin. It monitors competitors across 12 data source types, detects signals (pricing changes, launches, hiring, funding, reviews), and generates AI-powered battle cards, intel briefs, and real-time alerts.

## Core Value Proposition

One command to add a competitor. Auto-discovers monitors. Continuously tracks changes. Generates actionable intelligence for founders, product managers, and sales teams.

## Architecture: Dual Entry Points (Same as Veille)

Single package with `src/core/` (all business logic), `src/mcp.ts` (MCP server), `src/openclaw.ts` (OpenClaw plugin), `src/bin.ts` (CLI). Framework-agnostic tool definitions with Zod (MCP) and TypeBox (OpenClaw) adapters.

```
src/
├── index.ts                    re-exports openclaw (backward compat)
├── openclaw.ts                 OpenClaw plugin entry point
├── mcp.ts                      MCP server entry point
├── bin.ts                      CLI for npx
├── adapters/
│   ├── zod-schema.ts           ToolParamDef → Zod
│   ├── typebox-schema.ts       ToolParamDef → TypeBox
│   └── index.ts
└── core/
    ├── index.ts                barrel export
    ├── plugin-id.ts            PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION
    ├── config/                 schema, defaults, loader
    ├── db/
    │   ├── client.ts           Supabase singleton
    │   ├── competitors.ts      CRUD for competitors
    │   ├── monitors.ts         CRUD for monitors
    │   ├── signals.ts          CRUD + search for signals
    │   ├── battlecards.ts      CRUD for battle cards
    │   ├── briefs.ts           CRUD for intel briefs
    │   ├── alert-log.ts        CRUD for alert audit trail
    │   └── index.ts
    ├── fetchers/
    │   ├── base.ts             BaseFetcher (rate limit + retry via Bottleneck)
    │   ├── web-diff.ts         Pricing/feature page change detection
    │   ├── github.ts           Releases, stars, README changes
    │   ├── rss.ts              Generic RSS/Atom feeds
    │   ├── jobs.ts             Greenhouse/Lever/Ashby job boards
    │   ├── npm.ts              npm/PyPI package registry
    │   ├── twitter.ts          Twitter/X accounts and searches
    │   ├── reddit.ts           Subreddit mentions
    │   ├── producthunt.ts      Product Hunt launches
    │   ├── g2.ts               G2 reviews
    │   ├── crunchbase.ts       Funding rounds
    │   ├── linkedin.ts         LinkedIn company posts (via RSSHub)
    │   ├── hackernews.ts       HN mentions and discussions
    │   ├── rate-limiter.ts     Per-source rate limiting
    │   └── index.ts            createFetcherRegistry()
    ├── analysis/
    │   ├── prompts.ts          AI prompt templates for all outputs
    │   ├── signal-classifier.ts  Classify signal severity (low/medium/high/critical)
    │   ├── battlecard-builder.ts Build battle card from competitor signals
    │   ├── brief-builder.ts    Build weekly/monthly intel brief
    │   └── index.ts
    ├── alerts/
    │   ├── base.ts             BaseNotifier interface
    │   ├── slack.ts            Slack incoming webhook
    │   ├── webhook.ts          Generic HTTP webhook
    │   ├── email.ts            Email via SMTP
    │   └── index.ts            createNotifierRegistry()
    ├── tools/
    │   ├── types.ts            ToolParamDef, ToolDefinition (identical to veille)
    │   ├── manage-competitors.ts  add, list, update, remove competitor
    │   ├── manage-monitors.ts  add, list, remove monitor
    │   ├── fetch-now.ts        trigger immediate fetch
    │   ├── list-signals.ts     list/filter detected signals
    │   ├── generate-battlecard.ts  generate per-competitor battle card
    │   ├── generate-brief.ts   generate weekly/monthly intel brief
    │   ├── search.ts           full-text search across signals
    │   ├── status.ts           system health and stats
    │   └── index.ts            createAllTools()
    ├── services/
    │   ├── compete-scheduler.ts  Cron jobs for fetch + brief + alerts
    │   └── index.ts
    ├── types/
    │   ├── common.ts           Enums: MonitorType, SignalType, Severity, BriefType, NotifierType
    │   ├── config.ts           PluginConfig interface
    │   ├── database.ts         Entity types: Competitor, Monitor, Signal, Battlecard, Brief, AlertLog
    │   ├── fetcher.ts          Fetcher, FetchResult interfaces
    │   ├── analysis.ts         BattlecardData, BriefData, PromptData interfaces
    │   ├── alerts.ts           Notifier, AlertPayload interfaces
    │   └── index.ts
    └── utils/
        ├── errors.ts           Custom error classes
        ├── logger.ts           Structured logging
        ├── retry.ts            withRetry() with exponential backoff
        ├── url.ts              URL utilities
        ├── text.ts             Text utilities (truncate, stripHtml, diff)
        ├── date.ts             Date formatting
        ├── hash.ts             Content hashing for change detection
        └── index.ts
```

## Data Model

### Competitors Table

```sql
CREATE TABLE competitors (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, website)
);
```

### Monitors Table

```sql
CREATE TABLE monitors (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  monitor_type TEXT NOT NULL,  -- enum: web-diff, github, rss, jobs, npm, twitter, reddit, producthunt, g2, crunchbase, linkedin, hackernews
  url TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  last_fetched_at TIMESTAMPTZ,
  last_content_hash TEXT,      -- for change detection (web-diff)
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, competitor_id, monitor_type, url)
);
```

### Signals Table

```sql
CREATE TABLE signals (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,  -- pricing_change, feature_launch, funding_round, new_hire, job_posting, release, review, social_mention, news, content_change, other
  severity TEXT NOT NULL DEFAULT 'medium',  -- low, medium, high, critical
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  url TEXT,
  metadata JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fts TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED
);

CREATE INDEX signals_fts_idx ON signals USING GIN(fts);
CREATE INDEX signals_competitor_idx ON signals(competitor_id, detected_at DESC);
CREATE INDEX signals_severity_idx ON signals(severity, detected_at DESC);
```

### Battlecards Table

```sql
CREATE TABLE battlecards (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  markdown TEXT NOT NULL,
  html TEXT,
  signal_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Briefs Table

```sql
CREATE TABLE briefs (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  brief_type TEXT NOT NULL DEFAULT 'weekly',  -- weekly, monthly
  date DATE NOT NULL,
  title TEXT,
  markdown TEXT NOT NULL,
  html TEXT,
  signal_count INTEGER DEFAULT 0,
  competitor_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date, brief_type)
);
```

### Alert Log Table

```sql
CREATE TABLE alert_log (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  signal_id INTEGER REFERENCES signals(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,  -- slack, webhook, email
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, failed
  payload JSONB,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 12 Fetchers

### 1. web-diff (Pricing/Feature Page Monitor)

Fetches a web page, extracts text content via Readability/Cheerio, hashes it, compares against `last_content_hash` on the monitor. If changed, emits a signal with the diff. This is the killer feature — detects pricing changes, new features, copy changes.

### 2. github (GitHub Repository Monitor)

Uses GitHub REST API (octokit or raw fetch). Monitors:
- New releases → `release` signal
- Star count changes → metadata tracking
- README changes → `content_change` signal
- Config: `{ owner, repo }` parsed from URL

### 3. rss (RSS/Atom Feed Monitor)

Reuses veille's rss-parser approach. Monitors changelogs, blogs, news feeds. Each new item becomes a signal.

### 4. jobs (Job Board Monitor)

Fetches structured job listings from ATS platforms:
- Greenhouse: `boards.greenhouse.io/{company}/jobs`
- Lever: `jobs.lever.co/{company}`
- Ashby: `jobs.ashbyhq.com/{company}`
Parses job titles, departments, locations. New postings → `job_posting` signals. Patterns in departments → `new_hire` signals.

### 5. npm (Package Registry Monitor)

Fetches `registry.npmjs.org/{package}` for version history, `api.npmjs.org/downloads` for download trends. New versions → `release` signals. Can also monitor PyPI.

### 6. twitter (Twitter/X Monitor)

Uses twitter-api-v2. Monitors competitor accounts and search queries. New tweets → `social_mention` signals.

### 7. reddit (Reddit Monitor)

Searches subreddits for competitor mentions. Uses Reddit JSON API (`reddit.com/search.json?q=...`). New posts/comments → `social_mention` signals.

### 8. producthunt (Product Hunt Monitor)

RSS feed (`producthunt.com/feed`) or GraphQL API. Detects competitor launches → `feature_launch` signals with upvote counts.

### 9. g2 (G2 Review Monitor)

Scrapes G2 competitor profile pages. Extracts reviews via JSON-LD structured data. New reviews → `review` signals with rating and sentiment.

### 10. crunchbase (Crunchbase Monitor)

Uses Crunchbase Basic API or RSS for funding news. Detects funding rounds → `funding_round` signals.

### 11. linkedin (LinkedIn Monitor)

Uses RSSHub proxy (`rsshub.app/linkedin/company/{id}`) to get company posts as RSS. New posts → `social_mention` signals.

### 12. hackernews (Hacker News Monitor)

Uses HN Algolia API (`hn.algolia.com/api/v1/search`). Searches for competitor mentions. New stories/comments → `social_mention` signals.

## 13 Tools

| # | Tool | Description |
|---|------|-------------|
| 1 | `compete_add_competitor` | Add competitor with name + website. Auto-discovers monitors (changelogs, GitHub, jobs, etc.) |
| 2 | `compete_list_competitors` | List all tracked competitors with monitor/signal counts |
| 3 | `compete_update_competitor` | Update competitor name, website, description, industry |
| 4 | `compete_remove_competitor` | Remove competitor (cascades to monitors + signals) |
| 5 | `compete_add_monitor` | Add a specific monitor to a competitor (12 types) |
| 6 | `compete_list_monitors` | List monitors for a competitor or all, with last fetch status |
| 7 | `compete_remove_monitor` | Remove a specific monitor |
| 8 | `compete_fetch_now` | Trigger immediate fetch (all, per-competitor, or per-monitor) |
| 9 | `compete_list_signals` | List signals with filters: competitor, severity, type, date range |
| 10 | `compete_generate_brief` | Generate weekly/monthly cross-competitor intel brief (returns AI prompt data) |
| 11 | `compete_generate_battlecard` | Generate per-competitor battle card (returns AI prompt data) |
| 12 | `compete_search` | Full-text search across all signals |
| 13 | `compete_status` | System health: competitor count, monitor count, signal count, last fetch, schedule |

## Auto-Discovery

When `compete_add_competitor` is called with just a name and website URL, it probes:
1. `{website}/changelog` — check for RSS feed → add rss monitor
2. `{website}/blog` — check for RSS feed → add rss monitor
3. `{website}/pricing` — add web-diff monitor
4. `{website}/features` — add web-diff monitor
5. GitHub search for org matching the domain → add github monitor(s)
6. npm search for packages by the org → add npm monitor(s)
7. Greenhouse/Lever/Ashby lookup by company name → add jobs monitor
8. G2 search for the company → add g2 monitor

Returns the list of auto-discovered monitors so the user can review.

## Analysis Layer

### Signal Classifier

When a signal is detected, it gets a severity classification:
- **critical**: Pricing change, major funding round, acquisition
- **high**: New product launch, major release, key hire announcement
- **medium**: New job posting, new review, blog post, social mention
- **low**: Minor version bump, routine social post

The classifier uses simple rules (signal_type + metadata heuristics). No LLM needed.

### Battle Card Builder

Gathers the last N signals for a competitor, groups by type, builds a structured prompt:
- Company overview (from competitor record)
- Recent moves (last 30 days of signals)
- Strengths (inferred from positive reviews, launches, hiring)
- Weaknesses (inferred from negative reviews, job churn, issues)
- Pricing comparison (from web-diff signals on pricing page)
- Talk tracks for sales (objection handling based on signals)

Returns prompt data — the agent's LLM generates the actual battle card.

### Brief Builder

Gathers signals across all competitors for the time period, ranks by severity, builds a prompt:
- Executive summary
- Top competitive moves this week
- Per-competitor highlights
- Recommended actions

Returns prompt data — the agent's LLM generates the brief.

## Alerts

Real-time notifications when high-priority signals are detected:

| Channel | Config | Trigger |
|---------|--------|---------|
| Slack | `COMPETE_SLACK_WEBHOOK_URL` | severity >= high |
| Webhook | `COMPETE_ALERT_WEBHOOK_URL` | severity >= high |
| Email | `COMPETE_ALERT_EMAIL` + SMTP config | severity = critical |

Alert threshold is configurable. Alerts fire during the fetch job when new signals are classified.

## Scheduler

Three cron jobs via croner:
1. **Fetch**: `0 */6 * * *` (every 6 hours) — fetch all enabled monitors
2. **Weekly brief**: `0 9 * * 1` (Monday 9 AM) — generate + optional auto-send
3. **Alert check**: runs as part of fetch job — alert on high/critical signals

## Config (Environment Variables for MCP)

```
COMPETE_SUPABASE_URL          (required)
COMPETE_SUPABASE_KEY          (required)
COMPETE_TENANT_ID             (default: "default")
COMPETE_FETCH_SCHEDULE        (default: "0 */6 * * *")
COMPETE_BRIEF_SCHEDULE        (default: "0 9 * * 1")
COMPETE_GITHUB_TOKEN          (optional, for higher rate limits)
COMPETE_TWITTER_BEARER_TOKEN  (optional, for Twitter monitoring)
COMPETE_SLACK_WEBHOOK_URL     (optional, for Slack alerts)
COMPETE_ALERT_WEBHOOK_URL     (optional, for webhook alerts)
COMPETE_ALERT_EMAIL           (optional, for email alerts)
COMPETE_SMTP_HOST             (optional)
COMPETE_SMTP_PORT             (optional)
COMPETE_SMTP_USER             (optional)
COMPETE_SMTP_PASS             (optional)
COMPETE_ALERT_SEVERITY        (default: "high" — minimum severity to trigger alerts)
```

## Package.json Exports

```json
{
  "name": "@raijinlabs/compete",
  "bin": { "compete-mcp": "./dist/bin.js" },
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./mcp": { "import": "./dist/mcp.js", "types": "./dist/mcp.d.ts" },
    "./core": { "import": "./dist/core/index.js", "types": "./dist/core/index.d.ts" }
  }
}
```

## Dependencies

```
@supabase/supabase-js    @sinclair/typebox    @modelcontextprotocol/sdk
zod                      rss-parser           twitter-api-v2
bottleneck               croner               cheerio
jsdom                    @mozilla/readability  marked
```

Dev: `typescript  tsup  vitest  @vitest/coverage-v8  eslint  prettier`

## Test Strategy

- Unit tests for each fetcher (mock HTTP responses)
- Unit tests for signal classifier
- Unit tests for analysis builders (prompt generation)
- Unit tests for each DB module (mock Supabase)
- Unit tests for schema adapters
- Integration tests: fetch pipeline, analysis pipeline, alert pipeline
- Integration test: tool registration (13 tools)
- E2E smoke test: register plugin, verify tools
- MCP server test: createCompeteServer() returns server with 13 tools
