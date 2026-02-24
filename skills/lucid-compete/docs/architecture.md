# Architecture

This document describes the high-level architecture of `@raijinlabs/compete`.

## Dual Entry Point Design

The plugin exposes two entry points that share the same core logic:

```
src/
  bin.ts            # CLI entry: starts MCP server over stdio
  mcp.ts            # MCP entry: createCompeteServer() using @modelcontextprotocol/sdk
  openclaw.ts       # OpenClaw entry: register() exports tools + background service
  index.ts          # Default export re-exports the OpenClaw register function
```

**MCP path** (`bin.ts` / `mcp.ts`): Creates an `McpServer`, registers all 13 tools with Zod-converted schemas, starts the scheduler, and connects via `StdioServerTransport`. This is what runs when a user invokes `npx @raijinlabs/compete`.

**OpenClaw path** (`openclaw.ts` / `index.ts`): Exports a `register(api)` function that registers tools with TypeBox schemas and a background scheduler service through the OpenClaw plugin API.

Both paths call the same `createAllTools()` factory and `startScheduler()`, ensuring identical behavior regardless of entry point.

## Core Data Model

```
Competitor  1 ──── * Monitor  1 ──── * Signal
    │                                     │
    └──── * Battlecard                    │
    └──── * Brief ─────────────────── aggregates
                                          │
                                     AlertLog
```

- **Competitor** -- a company being tracked (name, website, industry, description)
- **Monitor** -- a specific data source to watch for a competitor (type, URL, config, enabled flag, fetch status)
- **Signal** -- a detected competitive event (type, severity, title, summary, source URL, raw content)
- **Battlecard** -- a generated competitive analysis document for a single competitor
- **Brief** -- a periodic (weekly/monthly) intelligence summary across all competitors
- **AlertLog** -- a record of alert delivery attempts (channel, status, error)

All tables are scoped by `tenant_id` for multi-tenancy. Schema lives in `migrations/001_compete_schema.sql` and `migrations/002_alerts.sql`.

## Fetcher Registry Pattern

Each of the 12 data source types is implemented as a fetcher class extending `BaseFetcher`:

```
core/fetchers/
  base.ts           # Abstract BaseFetcher with rate limiting
  web-diff.ts       # Web page change detection
  github.ts         # GitHub repos, releases, activity
  rss.ts            # RSS/Atom feed parsing
  npm.ts            # npm registry queries
  jobs.ts           # Job posting aggregation
  twitter.ts        # Twitter/X API
  reddit.ts         # Reddit search
  hackernews.ts     # Hacker News API
  producthunt.ts    # Product Hunt scraping
  linkedin.ts       # LinkedIn company pages
  g2.ts             # G2 review aggregation
  crunchbase.ts     # Crunchbase funding data
  rate-limiter.ts   # Bottleneck-based per-domain rate limiting
  index.ts          # createFetcherRegistry() factory
```

`createFetcherRegistry(config)` instantiates all fetcher classes and builds a `Map<MonitorType, Fetcher>`. Fetchers that lack required credentials (e.g., GitHub without a token) report `isConfigured() === false` and are excluded from the registry.

Each fetcher implements `fetch(monitor, competitor): Promise<FetchResult>`, returning an array of raw signals and optional metadata (content hash for change detection, etc.).

## Analysis Pipeline

```
Signals (raw)
    │
    ▼
Signal Classifier ─── assigns severity (low / medium / high / critical)
    │
    ▼
Classified Signals ─── stored in DB, trigger alerts if high/critical
    │
    ├──▶ Battlecard Builder ─── aggregates signals for one competitor
    │        └── system prompt + user prompt for LLM consumption
    │
    └──▶ Brief Builder ─── aggregates signals across all competitors
             └── system prompt + user prompt for LLM consumption
```

- **Signal Classifier** (`core/analysis/signal-classifier.ts`): Rule-based severity assignment using signal type and content heuristics.
- **Battlecard Builder** (`core/analysis/battlecard-builder.ts`): Constructs a structured prompt from competitor info and recent signals, ready for LLM-powered analysis.
- **Brief Builder** (`core/analysis/brief-builder.ts`): Groups signals by competitor and builds a summary prompt for weekly or monthly briefs.
- **Prompts** (`core/analysis/prompts.ts`): System prompts for battlecard and brief generation.

The builders produce `{ systemPrompt, userPrompt, signalCount, ... }` objects. The host LLM (Claude, GPT, etc.) processes these prompts at tool invocation time, so the plugin itself does not call any LLM API directly.

## Alert Flow

```
High/Critical Signal detected
    │
    ▼
Notifier Registry (Map<NotifierType, Notifier>)
    │
    ├── SlackNotifier ──▶ Slack incoming webhook
    ├── WebhookNotifier ──▶ Generic HTTP POST
    └── EmailNotifier ──▶ SMTP email
```

Alerts fire on a best-effort basis during `compete_fetch_now` and scheduled fetches. Each notifier checks `isConfigured()` at startup; only configured channels are included in the registry.

Alert delivery is logged to the `alert_logs` table with status (`pending` / `sent` / `failed`) for auditability.

The `COMPETE_ALERT_SEVERITY` config sets the minimum severity threshold (default: `high`).

## Scheduler Design

The scheduler uses [Croner](https://github.com/hexagon/croner) for cron-based job scheduling:

- **Fetch job** (`config.fetchSchedule`, default `0 */6 * * *`): Runs `compete_fetch_now` against all enabled monitors every 6 hours.
- **Brief job** (`config.briefSchedule`, default `0 9 * * 1`): Generates a weekly brief every Monday at 9 AM.

The scheduler starts automatically when the MCP server is created or when the OpenClaw service is started. It can be stopped cleanly via `stopScheduler()`, which the OpenClaw service stop hook calls.
