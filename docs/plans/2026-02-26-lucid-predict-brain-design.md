# Lucid Predict v5 — Edge Hunter Brain Design

**Date:** 2026-02-26
**Status:** Approved
**Author:** DaishizenSensei + Claude

## Overview

Transform lucid-predict from a pure markdown AgentSkills knowledge base (v4.0) into a TypeScript MCP server with a brain layer focused on **systematic edge detection** in prediction markets. The architecture follows the same patterns as lucid-trade v5 but with domain-specific intelligence.

### Design Philosophy

> "The common characteristic of top traders is not predictive ability but systematically identifying market pricing errors." — Polymarket 2025 Whale Report

We don't try to "predict better." We build systematic tools that:
1. Detect mispricings through quantitative analysis
2. Size positions optimally using Kelly criterion
3. Exploit cross-platform arbitrage for guaranteed profit
4. Track calibration to improve over time

### What Actually Wins (Evidence-Based)

| Strategy | Mechanism | Annualized Return | Risk |
|----------|-----------|-------------------|------|
| High-probability bonding | Buy >$0.95 events near-certain to resolve YES | ~1800% | Very low |
| Cross-platform arbitrage | Same event, different prices | 50-200% | Low (resolution risk) |
| Superforecaster calibration | Base rate + Bayesian adjustment | 80-150% | Medium |
| Correlation lag exploitation | Related event resolved, this one hasn't moved | 100-300% | Medium |
| Information asymmetry | Domain expertise before crowd prices it in | Variable | High |
| Liquidity premium capture | Thin markets are systematically mispriced | 40-100% | Medium-high |

Sources:
- [Polymarket 2025 Six Profit Models Report](https://www.chaincatcher.com/en/article/2233047)
- [Application of Kelly Criterion to Prediction Markets (2024)](https://arxiv.org/html/2412.14144v1)
- [Tetlock's Superforecasting](https://www.cultivatelabs.com/posts/superforecasting-everything-has-a-base-rate)

---

## Architecture

### Brain-First Approach

Unlike trade (which had a separate foundation phase), predict builds adapters + intelligence + brain in one shot. Prediction market math (EV, Kelly, overround) is 10x simpler than technical analysis — no need for a separate intelligence phase.

```
lucid_evaluate  ──→  runEvaluation()  ──→  math/* (pure functions)
lucid_discover  ──→  adapters/*       ──→  Polymarket/Manifold/Kalshi APIs
lucid_arbitrage ──→  correlation.ts   ──→  matchMarkets() + spread calc
lucid_correlate ──→  correlation.ts   ──→  titleSimilarity() + price delta
lucid_size      ──→  kelly.ts         ──→  portfolioKelly() + constraints
lucid_calibrate ──→  brier.ts         ──→  brierScore() + calibration curve
lucid_pro       ──→  raw-tools.ts     ──→  all math + adapter functions
```

### Platform Support

| Platform | API | Auth | Status |
|----------|-----|------|--------|
| **Polymarket** | Gamma API (`gamma-api.polymarket.com`) | Public | Full |
| **Manifold** | v0 API (`api.manifold.markets/v0`) | Public | Full |
| **Kalshi** | v2 API (`api.elections.kalshi.com/trade-api/v2`) | RSA-signed | Full |

---

## Core Types

### Unified Market Model

```typescript
type PlatformId = 'polymarket' | 'manifold' | 'kalshi';
type ResolutionType = 'binary' | 'multiple_choice' | 'scalar';
type MarketStatus = 'open' | 'closed' | 'resolved' | 'disputed';
type MarketCategory =
  | 'politics' | 'crypto' | 'sports' | 'science'
  | 'economics' | 'technology' | 'entertainment'
  | 'world_events' | 'other';

interface Outcome {
  label: string;
  price: number;      // 0-1
}

interface Market {
  platform: PlatformId;
  externalId: string;
  title: string;
  description: string;
  category: MarketCategory;
  resolutionType: ResolutionType;
  outcomes: Outcome[];
  currentPrices: { yes: number; no: number } | Record<string, number>;
  volumeUsd: number;
  liquidityUsd: number;
  closeDate: string;   // ISO 8601
  status: MarketStatus;
  url: string;
}
```

### EvaluateResult (Core Contract)

The primary output type — equivalent to trade's `ThinkResult`:

```typescript
type MarketVerdict = 'BUY_YES' | 'BUY_NO' | 'SKIP' | 'HEDGE';

type EdgeType =
  | 'base_rate_deviation'
  | 'calibration_gap'
  | 'information_asymmetry'
  | 'time_decay'
  | 'liquidity_premium'
  | 'correlation_lag'
  | 'arbitrage';

interface EvaluateResult {
  schemaVersion: '1.0';

  market: {
    platform: PlatformId;
    externalId: string;
    title: string;
    category: string;
    resolutionType: ResolutionType;
    closeDate: string;
    daysToClose: number;
    url: string;
  };

  verdict: MarketVerdict;
  score: number;               // 0-100 conviction
  calibration: { type: 'bayesian_estimate'; isProbability: true };

  edge: {
    type: EdgeType;
    estimatedProbability: number;  // our Bayesian estimate (0-1)
    marketPrice: number;           // current market price (0-1)
    edgePct: number;               // (estimated - market) * 100
    direction: 'YES' | 'NO';
  };

  evidence: {
    baseRate: { value: number; source: string; description: string };
    adjustments: Array<{
      factor: string;
      direction: 'up' | 'down';
      magnitude: number;
      reasoning: string;
    }>;
    marketEfficiency: {
      overround: number;
      vig: number;
      fairPrice: number;
      isEfficient: boolean;
    };
    liquidity: {
      score: number;
      volumeUsd: number;
      liquidityUsd: number;
      rating: 'low' | 'medium' | 'high';
    };
    priceHistory?: {
      direction: 'up' | 'down' | 'stable';
      volatility: number;
      momentum: number;
    };
  };

  sizing: {
    kellyFraction: number;
    halfKelly: number;
    recommendedFraction: number;
    positionSize: number;
    expectedValue: number;
    expectedRoi: number;
    maxLoss: number;
    edgeThreshold: 'high_confidence' | 'medium' | 'thin' | 'no_edge';
  };

  risks: string[];
  invalidation: string;

  provenance: {
    platform: PlatformId;
    fetchedAt: number;
    bankroll: number;
  };

  rulesetVersion: string;
}
```

Key differences from trade's ThinkResult:
- `calibration.isProbability: true` — prediction markets deal in real probabilities
- `edge` object — the "why" is the gap between our estimate and market price
- `evidence.baseRate + adjustments` — Tetlock's superforecasting (outside view + inside view)
- `sizing` — Kelly criterion replaces ATR-based stops

### DiscoverResult

```typescript
interface DiscoverItem {
  market: Market;
  estimatedEdge: number;       // edge % quick estimate
  edgeType: EdgeType;
  liquidityScore: number;
  daysToClose: number;
  recommendation: string;      // one-line summary
}

interface DiscoverResult {
  schemaVersion: '1.0';
  query: string;
  filters: Record<string, string>;
  results: DiscoverItem[];
  platformsScanned: PlatformId[];
  marketsScanned: number;
  provenance: { fetchedAt: number };
}
```

### ArbitrageResult

```typescript
interface ArbitrageOpportunity {
  title: string;
  platformA: { platform: PlatformId; price: number; url: string; outcome: string };
  platformB: { platform: PlatformId; price: number; url: string; outcome: string };
  combinedCost: number;        // should be < 1.0 for arb
  guaranteedProfit: number;    // 1.0 - combinedCost
  profitPct: number;           // (guaranteedProfit / combinedCost) * 100
  titleSimilarity: number;     // 0-1 match confidence
  risks: string[];
}

interface ArbitrageResult {
  schemaVersion: '1.0';
  opportunities: ArbitrageOpportunity[];
  platformsScanned: PlatformId[];
  marketsCompared: number;
  minSpreadPct: number;
  provenance: { fetchedAt: number };
}
```

### CorrelateResult

```typescript
interface CorrelatedPair {
  marketA: { title: string; platform: PlatformId; price: number; status: MarketStatus };
  marketB: { title: string; platform: PlatformId; price: number; status: MarketStatus };
  similarity: number;          // title similarity 0-1
  priceCorrelation: number;    // expected correlation
  opportunity?: string;        // explanation of the edge
  estimatedEdge: number;
}

interface CorrelateResult {
  schemaVersion: '1.0';
  pairs: CorrelatedPair[];
  marketsAnalyzed: number;
  provenance: { fetchedAt: number };
}
```

### SizeResult

```typescript
interface PositionAllocation {
  marketTitle: string;
  platform: PlatformId;
  side: 'YES' | 'NO';
  currentAllocation: number;
  recommendedAllocation: number;
  kellyFraction: number;
  expectedValue: number;
  correlationAdjustment: number;
}

interface SizeResult {
  schemaVersion: '1.0';
  bankroll: number;
  totalAllocated: number;
  totalAllocatedPct: number;
  positions: PositionAllocation[];
  diversificationScore: number;   // 0-100
  maxDrawdownEstimate: number;
  provenance: { computedAt: number };
}
```

### CalibrateResult

```typescript
interface CalibrationBucket {
  range: string;                   // "0.0-0.1", "0.1-0.2", etc.
  predicted: number;               // average predicted probability
  actual: number;                  // actual resolution rate
  count: number;                   // number of forecasts in bucket
  deviation: number;               // |predicted - actual|
}

interface CalibrateResult {
  schemaVersion: '1.0';
  brierScore: number;              // 0 = perfect, 1 = worst
  brierRating: 'excellent' | 'good' | 'average' | 'poor';
  totalForecasts: number;
  resolvedForecasts: number;
  calibrationCurve: CalibrationBucket[];
  overconfidenceScore: number;     // positive = overconfident, negative = underconfident
  bestCategory: string;
  worstCategory: string;
  provenance: { computedAt: number };
}
```

---

## Intelligence Layer (math/)

All pure functions, synchronous, no side effects:

### ev.ts — Expected Value

```typescript
interface EvResult {
  payout: number;           // stake / price
  expectedPayout: number;   // probability * payout
  ev: number;               // expectedPayout - stake
  roiPct: number;           // (ev / stake) * 100
  edgePct: number;          // (probability - price) * 100
  isPositiveEv: boolean;
}

function expectedValue(stake: number, price: number, probability: number): EvResult;
```

### kelly.ts — Kelly Criterion

```typescript
interface KellyResult {
  fullKelly: number;        // f* = (b*p - q) / b
  halfKelly: number;        // f* / 2
  recommended: number;      // min(halfKelly, maxFraction)
  positionSize: number;     // bankroll * recommended
  shouldBet: boolean;       // recommended > 0
}

function kellyFraction(price: number, probability: number, bankroll: number, maxFraction?: number): KellyResult;
function portfolioKelly(positions: PortfolioPosition[]): PositionAllocation[];
```

### odds.ts — Odds Conversion

```typescript
type OddsFormat = 'probability' | 'decimal' | 'american' | 'fractional';

function convertOdds(value: number, from: OddsFormat, to: OddsFormat): number;
function impliedProbability(price: number): number;
```

### efficiency.ts — Market Efficiency

```typescript
interface EfficiencyResult {
  overround: number;
  vig: number;
  fairPrices: number[];
  isEfficient: boolean;
}

function analyzeEfficiency(prices: number[]): EfficiencyResult;
```

### liquidity.ts — Liquidity Scoring

```typescript
interface LiquidityResult {
  score: number;            // 0-100
  volumeComponent: number;
  liquidityComponent: number;
  rating: 'low' | 'medium' | 'high';
}

function liquidityScore(volumeUsd: number, liquidityUsd: number): LiquidityResult;
```

### brier.ts — Calibration Tracking

```typescript
interface Forecast {
  predictedProbability: number;
  actualOutcome: 0 | 1;
  category?: string;
}

function brierScore(forecasts: Forecast[]): number;
function calibrationBuckets(forecasts: Forecast[]): CalibrationBucket[];
function overconfidenceScore(buckets: CalibrationBucket[]): number;
```

### bayesian.ts — Probability Estimation

```typescript
interface Adjustment {
  factor: string;
  direction: 'up' | 'down';
  magnitude: number;        // 0-1 shift
  reasoning: string;
}

function estimateProbability(baseRate: number, adjustments: Adjustment[]): number;
function bayesianUpdate(prior: number, likelihoodRatio: number): number;
```

### correlation.ts — Market Matching

```typescript
function titleSimilarity(titleA: string, titleB: string): number;
function matchMarkets(marketsA: Market[], marketsB: Market[]): MatchedPair[];
function calculateSpread(priceA: number, priceB: number): number;
```

### time-value.ts — Time Decay

```typescript
function daysToClose(closeDate: string): number;
function timeDecayScore(daysToClose: number, price: number): number;
function isNearCertainExpiry(daysToClose: number, price: number, threshold?: number): boolean;
```

---

## Platform Adapters

### Interface

```typescript
interface IPlatformAdapter {
  platformId: PlatformId;

  searchMarkets(query: string, limit?: number): Promise<Market[]>;
  getMarket(externalId: string): Promise<Market>;
  getTrending(limit?: number): Promise<Market[]>;
  getMarketPrices(externalId: string): Promise<{ yes: number; no: number }>;
  getPriceHistory?(externalId: string): Promise<PricePoint[]>;
  getResolvedMarkets?(limit?: number): Promise<Market[]>;
}
```

### Polymarket Adapter
- Gamma API: `https://gamma-api.polymarket.com`
- Public, no auth
- Rate limits: 3 concurrent, 300ms between requests
- Normalizes `outcomePrices` → `currentPrices`, `endDate` → `closeDate`

### Manifold Adapter
- v0 API: `https://api.manifold.markets/v0`
- Public, no auth (optional API key for writes)
- Rate limits: 3 concurrent, 200ms between requests
- Normalizes `question` → `title`, `probability` → `currentPrices`

### Kalshi Adapter
- v2 API: `https://api.elections.kalshi.com/trade-api/v2`
- RSA-signed authentication required
- Events → Contracts hierarchy
- Requires `KALSHI_API_KEY` env var (or `KALSHI_EMAIL` + `KALSHI_PASSWORD`)

---

## Brain Tools (7)

### 1. lucid_evaluate — Deep Market Analysis

Input: `{ query: string, probability?: number, bankroll?: number, format?: 'json'|'text' }`

The agent provides either a market URL, an external ID, or a natural language query. If they provide their own probability estimate, we use it. Otherwise we build a Bayesian estimate from base rates.

Returns: `EvaluateResult` (structured JSON by default).

### 2. lucid_discover — Find Mispriced Markets

Input: `{ criteria?: string, platform?: PlatformId, category?: string, filters?: string, limit?: number }`

Filters: `closing_soon` (< 7 days), `high_volume` (> $100k), `underround` (overround < 0), `thin_market` (liquidity < 30), `high_edge` (estimated edge > 5%).

Returns: `DiscoverResult` with up to 20 ranked opportunities.

### 3. lucid_arbitrage — Cross-Platform Arbitrage

Input: `{ minSpreadPct?: number, category?: string }`

Fetches open markets from all platforms, matches by title similarity, finds YES_A + NO_B < $1.00 opportunities.

Returns: `ArbitrageResult` sorted by profit descending.

### 4. lucid_correlate — Correlated Event Exploitation

Input: `{ query?: string, includeResolved?: boolean }`

Finds markets with > 60% title similarity across platforms or within platform. Highlights pairs where one resolved but the other hasn't moved — this is the correlation lag edge.

Returns: `CorrelateResult`.

### 5. lucid_size — Portfolio Kelly Sizing

Input: `{ positions: Array<{ market, side, probability, price }>, bankroll: number }`

Computes optimal allocation across multiple positions using multi-position Kelly with:
- Half-Kelly conservative default
- 25% max single position cap
- Diversification scoring
- Max drawdown estimation

Returns: `SizeResult`.

### 6. lucid_calibrate — Prediction Accuracy Tracking

Input: `{ forecasts: Array<{ probability, outcome, category? }> }`

Computes Brier score, calibration curve, overconfidence score, best/worst category.

Returns: `CalibrateResult`.

### 7. lucid_pro — Raw Tools Escape Hatch

Input: `{ tool: string, params?: object }`

Access all math functions and adapter methods directly. `tool: 'list_tools'` shows available tools.

---

## Edge Detection Engine (runEvaluation)

The core analysis function that powers `lucid_evaluate`:

```
runEvaluation(params: EvaluationParams): EvaluateResult
```

### Scoring Algorithm

1. **Base rate**: Start with provided probability or market price as prior
2. **Efficiency check**: Calculate overround, vig, fair price
3. **Liquidity check**: Score tradability (0-100)
4. **Time decay check**: Near-expiry bonus for high-probability events
5. **Build edge**: `edgePct = (estimatedProbability - marketPrice) * 100`
6. **Classify edge type**: base_rate_deviation, calibration_gap, time_decay, etc.
7. **Size position**: Kelly criterion with conservative capping
8. **Score**: `min(100, round(abs(edgePct) * 3 + liquidityScore * 0.2 + timeDecayBonus))`
9. **Verdict**:
   - `edgePct >= 5%` → BUY_YES or BUY_NO (based on direction)
   - `edgePct < 2%` → SKIP (edge too thin)
   - `edgePct < 0%` → SKIP (wrong side)
   - Both sides have edge (rare) → HEDGE

### Recommendation Thresholds

| Edge % | Kelly | Threshold | Verdict |
|--------|-------|-----------|---------|
| >= 15% | > 0 | high_confidence | BUY |
| >= 5% | > 0 | medium | BUY |
| 2-5% | > 0 | thin | BUY (small size) |
| < 2% | any | no_edge | SKIP |
| any | <= 0 | no_edge | SKIP |

---

## Directory Structure

```
skills/lucid-predict/
├── src/
│   ├── index.ts
│   ├── plugin-id.ts
│   ├── mcp.ts
│   ├── openclaw.ts
│   ├── config.ts
│   ├── types/
│   │   └── index.ts          # Market, PlatformId, Outcome, etc.
│   ├── math/
│   │   ├── index.ts
│   │   ├── ev.ts
│   │   ├── ev.test.ts
│   │   ├── kelly.ts
│   │   ├── kelly.test.ts
│   │   ├── odds.ts
│   │   ├── odds.test.ts
│   │   ├── efficiency.ts
│   │   ├── efficiency.test.ts
│   │   ├── liquidity.ts
│   │   ├── liquidity.test.ts
│   │   ├── brier.ts
│   │   ├── brier.test.ts
│   │   ├── bayesian.ts
│   │   ├── bayesian.test.ts
│   │   ├── correlation.ts
│   │   ├── correlation.test.ts
│   │   ├── time-value.ts
│   │   └── time-value.test.ts
│   ├── adapters/
│   │   ├── types.ts
│   │   ├── registry.ts
│   │   ├── registry.test.ts
│   │   ├── polymarket.ts
│   │   ├── polymarket.test.ts
│   │   ├── manifold.ts
│   │   ├── manifold.test.ts
│   │   ├── kalshi.ts
│   │   └── kalshi.test.ts
│   ├── brain/
│   │   ├── types.ts
│   │   ├── analysis.ts
│   │   ├── analysis.test.ts
│   │   ├── formatter.ts
│   │   ├── tools.ts
│   │   ├── tools.test.ts
│   │   └── index.ts
│   ├── tools/
│   │   ├── index.ts
│   │   └── raw-tools.ts
│   └── domain.ts
├── skills/                    # Keep existing markdown (backward compat)
│   ├── market-research/
│   ├── odds-analysis/
│   ├── arbitrage/
│   └── portfolio/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

---

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "bottleneck": "^2.19.5",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@types/node": "^22.15.21",
    "prettier": "^3.5.3",
    "tsup": "^8.4.0",
    "typescript": "^5.8.3",
    "vitest": "^3.1.3"
  }
}
```

No `decimal.js` needed (prediction math doesn't have float precision issues like financial trading). No `@supabase/supabase-js` (no database in v1). Kalshi auth uses built-in Node crypto for RSA signing.

---

## Test Strategy

- **math/**: Pure function tests with known inputs/outputs (the formulas are well-documented)
- **adapters/**: Mock HTTP responses, test normalization to unified Market model
- **brain/**: Integration tests with mock adapters (same pattern as trade)
- **Target**: 100+ tests across all modules
- **TDD**: Tests written first for all math functions

---

## Implementation Order

1. Foundation: package.json, tsconfig, types, plugin-id, config
2. Math layer: 9 pure function modules with tests (~50 tests)
3. Adapters: 3 platform adapters with mocked HTTP tests (~20 tests)
4. Brain analysis: runEvaluation engine (~15 tests)
5. Brain tools: 7 tool definitions (~15 tests)
6. Integration: MCP server, OpenClaw, barrel exports, domain adapter
7. Final review and documentation update
