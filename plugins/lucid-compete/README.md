# @raijinlabs/compete

Competitive intelligence monitoring, AI battle cards, and real-time alerts.

Track competitors across **12 data source types** with **13 tools**, generate AI-powered battle cards and intel briefs, and receive real-time alerts via Slack, webhooks, or email. Works as both an **MCP server** (Claude Desktop, etc.) and an **OpenClaw plugin**.

## Feature Highlights

- **12 data source types** -- web-diff, GitHub, RSS, npm, jobs, Twitter/X, Reddit, Hacker News, Product Hunt, LinkedIn, G2, Crunchbase
- **13 tools** -- full CRUD for competitors and monitors, on-demand fetching, signal listing, search, battle cards, briefs, and system status
- **AI-powered analysis** -- signal classification, competitive battle card generation, and periodic intel briefs (weekly/monthly)
- **Real-time alerts** -- Slack, generic webhook, and email notifications for high/critical signals
- **Dual entry point** -- use as an MCP server or as an OpenClaw plugin
- **Multi-tenant** -- built-in tenant isolation via configurable tenant ID
- **Scheduled monitoring** -- cron-based fetch and brief generation schedules

## Quick Start -- MCP (Claude Desktop)

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "compete": {
      "command": "npx",
      "args": ["-y", "@raijinlabs/compete"],
      "env": {
        "COMPETE_SUPABASE_URL": "your-url",
        "COMPETE_SUPABASE_KEY": "your-key"
      }
    }
  }
}
```

## Quick Start -- OpenClaw

Install the package:

```bash
npm install @raijinlabs/compete
```

Then add it to your `openclaw.extensions`:

```json
{
  "openclaw": {
    "extensions": ["@raijinlabs/compete"]
  }
}
```

## Database Setup

This plugin requires a [Supabase](https://supabase.com/) project. Run the SQL migrations in `migrations/` against your Supabase project to create the required tables:

1. `migrations/001_compete_schema.sql` -- core tables (competitors, monitors, signals, battlecards, briefs)
2. `migrations/002_alerts.sql` -- alert log table and indexes

Apply them via the Supabase SQL Editor or CLI.

## Tools

| Tool | Description |
| --- | --- |
| `compete_add_competitor` | Add a new competitor to track. Automatically discovers monitorable endpoints (pricing pages, RSS feeds). |
| `compete_list_competitors` | List all tracked competitors, optionally filtered by industry. |
| `compete_update_competitor` | Update an existing competitor's details. |
| `compete_remove_competitor` | Remove a competitor and all associated monitors and signals (cascading delete). |
| `compete_add_monitor` | Add a new monitor to track a specific source for a competitor. |
| `compete_list_monitors` | List monitors, optionally filtered by competitor or enabled status. |
| `compete_remove_monitor` | Remove a monitor by ID. |
| `compete_fetch_now` | Fetch the latest data from monitors immediately. Can target a specific monitor, all monitors for a competitor, or all enabled monitors. |
| `compete_list_signals` | List competitive signals with optional filters by competitor, severity, type, and date range. |
| `compete_generate_battlecard` | Generate a competitive battlecard for a specific competitor based on recent signals. |
| `compete_generate_brief` | Generate a competitive intelligence brief (weekly or monthly) summarizing recent signals across all competitors. |
| `compete_search` | Full-text search across all competitive signals (title, summary, content). |
| `compete_status` | Get an overview of the competitive intelligence system: competitor count, monitor count, signal counts by severity, and last fetch time. |

## Data Sources

| Monitor Type | Description |
| --- | --- |
| `web-diff` | Track changes to any web page (pricing, features, landing pages) |
| `github` | Monitor GitHub repositories for releases, stars, and activity |
| `rss` | Follow RSS/Atom feeds (blogs, changelogs, news) |
| `npm` | Track npm package versions and download trends |
| `jobs` | Monitor job postings for hiring signals |
| `twitter` | Track Twitter/X mentions and posts |
| `reddit` | Monitor Reddit discussions and mentions |
| `hackernews` | Track Hacker News mentions and discussions |
| `producthunt` | Monitor Product Hunt launches |
| `linkedin` | Track LinkedIn company activity |
| `g2` | Monitor G2 review scores and sentiment |
| `crunchbase` | Track funding rounds and company data |

## Configuration

All configuration is read from environment variables with the `COMPETE_` prefix. See `.env.example` for a complete template.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `COMPETE_SUPABASE_URL` | Yes | -- | Supabase project URL |
| `COMPETE_SUPABASE_KEY` | Yes | -- | Supabase service role key |
| `COMPETE_TENANT_ID` | No | `default` | Tenant ID for multi-tenancy |
| `COMPETE_FETCH_SCHEDULE` | No | `0 */6 * * *` | Cron schedule for fetching monitors (default: every 6 hours) |
| `COMPETE_BRIEF_SCHEDULE` | No | `0 9 * * 1` | Cron schedule for generating weekly briefs (default: Monday 9 AM) |
| `COMPETE_GITHUB_TOKEN` | No | -- | GitHub personal access token (for higher rate limits) |
| `COMPETE_TWITTER_BEARER_TOKEN` | No | -- | Twitter/X API bearer token |
| `COMPETE_SLACK_WEBHOOK_URL` | No | -- | Slack incoming webhook URL for alerts |
| `COMPETE_ALERT_WEBHOOK_URL` | No | -- | Generic webhook URL for alerts |
| `COMPETE_ALERT_EMAIL` | No | -- | Email address for critical alerts |
| `COMPETE_SMTP_HOST` | No | -- | SMTP host for email alerts |
| `COMPETE_SMTP_PORT` | No | -- | SMTP port |
| `COMPETE_SMTP_USER` | No | -- | SMTP username |
| `COMPETE_SMTP_PASS` | No | -- | SMTP password |
| `COMPETE_ALERT_SEVERITY` | No | `high` | Minimum severity to trigger alerts (`low`, `medium`, `high`, `critical`) |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type-check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

## License

MIT
