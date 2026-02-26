---
name: market-research
description: "Search, discover, and analyze prediction markets across Polymarket, Manifold, and Kalshi"
---

# Market Research

Search, discover, and analyze prediction markets across multiple platforms. In v5, market research is powered by the `lucid_discover` brain tool and three platform adapters.

## Brain Tools

| Tool | Use For |
|------|---------|
| `lucid_discover` | Scan all platforms for edge opportunities, filter by minimum edge |
| `lucid_evaluate` | Deep evaluation of a single market with EV/Kelly/efficiency/time-decay |
| `lucid_pro` | Direct access to adapters and math functions |

## Supported Platforms

| Platform | API | Auth | Adapter |
|----------|-----|------|---------|
| **Polymarket** | Gamma API | Public (read-only) | `src/adapters/polymarket.ts` |
| **Manifold** | v0 API | Public (read-only) | `src/adapters/manifold.ts` |
| **Kalshi** | v2 API | API key required | `src/adapters/kalshi.ts` |

See `references/platforms.md` for full endpoint documentation and rate limits.

## Market Data Model

All platform responses are normalized to the `Market` type (`src/types/index.ts`):

| Field | Type | Description |
|-------|------|-------------|
| `platform` | PlatformId | Source platform (`polymarket`, `manifold`, `kalshi`) |
| `externalId` | string | Platform-specific market identifier |
| `title` | string | Market question/title |
| `description` | string | Full description |
| `outcomes` | Outcome[] | List of outcomes with labels and prices |
| `currentPrices` | `{yes, no}` | Current prices (0.00 to 1.00) |
| `volumeUsd` | number | Total volume traded in USD |
| `liquidityUsd` | number | Available liquidity in USD |
| `closeDate` | string? | ISO 8601 when trading closes |
| `status` | string | `open` / `closed` / `resolved` / `disputed` |
| `url` | string | Direct link to market on platform |

## Discovery Flow

When `lucid_discover` is called:

1. Fetch markets from all registered adapters in parallel (up to 50 per platform)
2. For each market, run `runEvaluation()` combining EV, Kelly, efficiency, time decay
3. Auto-detect near-certain expiry opportunities (price >= 0.90, days <= 7)
4. Filter by minimum edge threshold (default 3%)
5. Sort by composite score descending
6. Return top N results with verdict and edge type

## Trend Analysis

When historical price data is available (via `lucid_pro > time_decay_score`):

- **Time decay score**: Exponential decay `1 - e^(-days/90)` — higher means more time value remaining
- **Near-certain expiry**: Markets at >= 90% with <= 7 days = high-probability bonding (1800% annualized)
- **Liquidity score**: Composite 0-100 based on volume and liquidity depth
