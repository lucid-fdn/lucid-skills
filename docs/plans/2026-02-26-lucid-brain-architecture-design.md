# Lucid Brain Architecture — Design Document

**Date:** 2026-02-26
**Status:** Draft
**Author:** DaishizenSensei / Claude
**Supersedes:** `2026-02-25-lucid-trade-v5-design.md` (125-tool approach replaced by brain layer)

---

## 1. Problem Statement

### The Senpi Threat
Senpi ($4.5M seed from Coinbase Ventures / Lemniscap) ships 44 MCP tools wrapping Hyperliquid's API — $100M+ volume, 65% win rate. Our lucid-trade v4 is pure markdown with zero executable tools.

#### Senpi Architecture (3 layers)
```
Layer 1: MCP Toolkit (44 proprietary tools wrapping Hyperliquid API)
Layer 2: Agent Skills (8 open-source Python strategies — WOLF v6, DSL v4, Scanner v5, etc.)
Layer 3: Platform (Railway deploy, Telegram, Privy auth, Points/leaderboard)
```

#### Senpi Strengths
- Deep Hyperliquid integration (leaderboard, SM tracking, mirror trading)
- Battle-tested autonomous trading (WOLF v6 — 7 cron jobs, 65% win rate)
- DSL v4 trailing stops with ROE-based tier ratcheting
- Smart money concentration detection via HL leaderboard
- Production maturity ($100M+ volume)

#### Senpi Weaknesses (Our Attack Surface)
1. **Single exchange lock-in** — Hyperliquid ONLY
2. **Perps only** — No spot, no DeFi, no yield, no LP
3. **Zero backtesting** — Can't test strategies before deploying
4. **Zero TA library** — No RSI, MACD, Bollinger — relies on SM signals only
5. **Zero risk framework** — No Kelly Criterion, no portfolio VaR, no volatility-adjusted sizing
6. **Stateless tools** — No memory, no personalization, no learning
7. **44 dumb tools** — Agent must orchestrate everything, fragile prompt engineering
8. **No cross-exchange intelligence** — Can't detect funding arb, price divergence, or capital flow
9. **Proprietary MCP** — Skills are open, but the 44 tools are closed-source

### The UX Problem
Building 125+ granular tools to compete tool-for-tool is the WRONG approach. An agent presented with 125 tools produces fragile, inconsistent results. The competitive advantage isn't tool count — it's **intelligence per interaction**.

### The Scaling Problem
Lucid has 18 plugins (trade, audit, predict, defi, observe, etc.). If each gets its own tool set, an agent using 5 domains sees 500+ tools. Unusable.

### The Insight
**Smart tools + simple routing = robust. Dumb tools + smart agent = fragile.**

The tool IS the brain. The agent just passes user intent. One tool call = complete, personalized answer.

---

## 2. UX Philosophy — Why This Is 300% Ahead

### How Professionals Work

Users don't think in tools. They think in **intent**:
- "Should I buy SOL?"
- "What's my portfolio risk right now?"
- "Find me the best trade opportunity"
- "Why is ETH pumping?"

**Bloomberg Terminal** doesn't ask "which indicator do you want?" — it shows everything relevant at once, organized by importance.

**A Goldman Sachs analyst** doesn't say "let me check RSI... now MACD... now funding..." — they give you a complete research note with a clear thesis, evidence, risks, and action.

**A professional trading desk** doesn't make you call 44 functions — you say "I want to get long SOL" and the desk handles routing, execution, risk checks, and reports back.

### Senpi's Architecture = Glorified API Wrapper

```
SENPI (mechanic's toolbox):
  "Here are 44 wrenches. Figure out which one fits."
  Agent must: learn 44 APIs → figure out call order → synthesize results
  Result: Fragile. Expensive (many LLM calls). Slow. Requires smart agent prompt.

US (smart mechanic):
  "Tell me what's wrong with the car. I'll fix it."
  Agent must: understand intent → call ONE function
  Result: Robust. Cheap. Fast. Works with ANY LLM, even a small one.
```

Senpi's 44 tools force the agent to be the brain. The agent decides which tools to call, in what order, and how to interpret results. That's not intelligence — that's prompt engineering fragility.

Our approach: the **TOOL is the brain**. The agent just routes intent. Any LLM, even a cheap one, can understand "user wants to buy SOL" and call one function. The intelligence is server-side, not prompt-side.

```
Senpi:  Dumb tools + Smart agent prompt = fragile, expensive, slow
Us:     Smart tools + Simple agent routing = robust, cheap, instant
```

This means our tools work with **any LLM, any agent framework, any skill level**. Senpi's tools require a smart agent that knows trading. Ours don't — the intelligence is baked in.

### The Ideal UX: One Call, Complete Answer

User: "Should I buy SOL?"

One call → `lucid_think("Should I buy SOL?")` → Complete answer:

```
┌─────────────────────────────────────────────┐
│  SOL — BUY (Confidence: 72/100)             │
│                                              │
│  WHY:                                        │
│  • RSI(14) = 34 — approaching oversold       │
│  • MACD bullish crossover forming on 4h      │
│  • Funding: -0.02% HL vs +0.01% dYdX        │
│  • 3 top-50 traders opened longs (2h ago)    │
│  • Support holding at $145                   │
│                                              │
│  HOW:                                        │
│  • Best venue: Hyperliquid (lowest cost)     │
│  • Size: $600 (6% portfolio, 2% risk)        │
│  • Entry: $148.50 | SL: $142.20 | TP: $162  │
│  • R:R: 2.2:1 | Leverage: 5x                │
│                                              │
│  RISKS:                                      │
│  • BTC macro downtrend could drag alts       │
│  • Liquidation at $134.80                    │
│                                              │
│  Say "execute" to place this trade.          │
└─────────────────────────────────────────────┘
```

This response comes from ONE tool call. Internally, the brain orchestrated: TA indicators (RSI, MACD, Bollinger) → trend detection → S/R levels → cross-exchange funding comparison → smart money tracking → risk engine (Kelly sizing, liquidation) → user memory (risk tolerance, preferred pairs, historical edge on SOL). The agent didn't need to know any of that.

### Two-Layer Architecture: Brain + Pro

**95% of users** interact with the Brain Layer — 6 intent-based tools that orchestrate everything internally and return complete answers.

**5% power users** want granular control. They get it via one escape hatch: `lucid_pro(tool, params)` — direct access to any of the 125+ internal functions.

```
┌─────────────────────────────────────────┐
│         BRAIN LAYER (6 tools)            │
│  What 95% of users and agents interact   │
│  with. Smart, intent-based, complete     │
│  answers. Works with any LLM.            │
│                                          │
│  lucid_think   → "Should I buy SOL?"     │
│  lucid_scan    → "Find breakout setups"  │
│  lucid_execute → "Open 2% long SOL"      │
│  lucid_watch   → "Alert if BTC < 60k"    │
│  lucid_protect → "Check all my risk"     │
│  lucid_review  → "How am I doing?"       │
├─────────────────────────────────────────┤
│         PRO LAYER (1 escape hatch)       │
│  For power users who want raw access     │
│  to individual functions.                │
│                                          │
│  lucid_pro("ta_get_rsi", {symbol:"SOL"}) │
│  lucid_pro("risk_calculate_kelly", ...)  │
│  lucid_pro("list_tools", {domain:"trade"})│
│                                          │
│  125+ granular tools per domain          │
│  Same engine, direct access              │
└─────────────────────────────────────────┘
```

Both layers use the same internal engine (97 tested functions). The brain layer orchestrates them automatically. The pro layer lets you drive manually.

### Memory Makes It Personal

Without memory, the brain gives generic answers. With memory, it becomes YOUR analyst:

**First interaction (cold start):**
Brain detects empty profile → asks 3 questions:
1. "What's your trading style?" (scalp / swing / position / degen)
2. "Risk per trade?" (1% / 2% / 5% / custom)
3. "Favorite pairs?" (BTC, ETH, SOL, etc.)

Then never asks again. Every trade enriches the profile automatically.

**After 10 trades:**
- "You win 72% on breakouts but only 45% on mean reversion — stop taking mean reversion trades"
- Position sizing auto-adjusts to your real Kelly edge (not theoretical)
- "You tend to hold winners 2x longer than optimal — consider tighter trailing stops"
- "Your best sessions are Asian hours — avoid US session entries"

**After 100 trades:**
The brain knows you better than you know yourself. Every recommendation is calibrated to YOUR actual edge, YOUR risk tolerance, YOUR emotional patterns.

Senpi can never do this. Their tools are stateless wrenches. Our tools learn.

---

## 3. Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WHAT THE AGENT SEES                       │
│                                                             │
│  7 tools. Forever. Regardless of domains installed.         │
│                                                             │
│  1. lucid_think(query)     "analyze SOL for swing trade"    │
│  2. lucid_scan(criteria)   "find altcoins breaking out"     │
│  3. lucid_execute(action)  "open 2% long SOL at market"     │
│  4. lucid_watch(what)      "alert me if BTC drops below 60k"│
│  5. lucid_protect()        "check all my risk exposure"     │
│  6. lucid_review()         "how am I performing?"           │
│  7. lucid_pro(tool, params) escape hatch for granular access│
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              BRAIN RUNTIME                                   │
│         packages/openclaw-core/extensions/brain/             │
│                                                             │
│  Intent Router                                              │
│  ├── Parses natural language intent                         │
│  ├── Polls DomainAdapters via canHandle() (0-100 score)     │
│  ├── Routes to highest scorer (or multiple for cross-domain)│
│  └── Disambiguates when scores are close                    │
│                                                             │
│  Memory Manager (IMemoryAdapter)                            │
│  ├── Auto-detects runtime (OpenClaw files vs Supabase)      │
│  ├── Loads user preferences + domain history before action  │
│  └── Writes outcomes after execution                        │
│                                                             │
│  Response Formatter                                         │
│  └── Consistent structure: summary → details → next steps   │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
    ┌──────▼──────┐                   ┌───────▼──────┐
    │   MEMORY    │                   │    DOMAIN    │
    │  ADAPTERS   │                   │   ADAPTERS   │
    └──────┬──────┘                   └───────┬──────┘
           │                                  │
  ┌────────▼────────┐           ┌─────────────▼─────────────┐
  │ OpenClawAdapter │           │ TradeDomainAdapter         │
  │ (file-based)    │           │ AuditDomainAdapter         │
  │                 │           │ PredictDomainAdapter       │
  │ SupabaseAdapter │           │ DefiDomainAdapter          │
  │ (pgvector)      │           │ ObserveDomainAdapter       │
  └─────────────────┘           │ ... (18 total)             │
                                └────────────────────────────┘
```

---

## 4. The 7 Brain Tools

### 4.1 `lucid_think(query: string)`
Deep analysis. The brain parses intent, routes to the right domain, loads user memory, and returns a complete answer.

Examples:
- `"analyze SOL for swing trade"` → trade domain: full TA + trend + S/R + risk sizing + confidence score, personalized to user's risk tolerance and historical edge on SOL
- `"audit 0xABC contract"` → audit domain: vulnerability scan + gas analysis + reentrancy check
- `"will ETH flip BTC this cycle?"` → predict domain: market analysis + prediction odds

### 4.2 `lucid_scan(criteria: string)`
Discovery and screening. Finds opportunities matching criteria across all active domains.

Examples:
- `"altcoins breaking out on high volume"` → trade: screens all exchanges
- `"DeFi yields above 10% on Solana"` → defi: scans protocols
- `"contracts with unverified code on Arbitrum"` → audit: scans chain

### 4.3 `lucid_execute(action: string)`
Takes action. The brain validates against user's policies, calculates optimal parameters, and executes.

Examples:
- `"open 2% long SOL at market"` → trade: validates via trading_policies, computes Kelly-sized position, routes to best exchange
- `"publish report to Notion"` → bridge: formats and posts

### 4.4 `lucid_watch(what: string)`
Sets up monitoring. Creates alerts, triggers, or ongoing scans.

Examples:
- `"alert if BTC drops below 60k"` → trade: price alert
- `"notify if any position hits -5%"` → trade: PnL alert
- `"watch for new critical Sentry issues"` → observe: monitoring

### 4.5 `lucid_protect()`
Risk check across ALL active domains. No parameters — the brain knows what to check.

Returns:
- Trade: position exposure, liquidation risks, concentration, drawdown status
- Predict: prediction market exposure, counterparty risk
- DeFi: IL risk, protocol health, liquidation proximity
- Cross-domain: correlated risks ("your SOL long + SOL DeFi LP = 2x SOL exposure")

### 4.6 `lucid_review()`
Performance review across ALL active domains. No parameters.

Returns:
- Trade: win rate, Sharpe, drawdown, best/worst setups, brain accuracy
- Predict: prediction accuracy, calibration
- Aggregated: total PnL, risk-adjusted returns, improvement suggestions

### 4.7 `lucid_pro(tool: string, params: object)`
Escape hatch for power users. Direct access to any granular tool from any domain.

Examples:
- `lucid_pro("ta_get_rsi", {symbol: "SOL", period: 14})` → bypasses brain, calls tool directly
- `lucid_pro("list_tools")` → returns all available granular tools across domains
- `lucid_pro("list_tools", {domain: "trade"})` → trade tools only

---

## 5. Domain Adapter Interface

Each plugin exports a domain adapter using duck typing (no import needed):

```typescript
// skills/lucid-trade/src/domain.ts
export const tradeDomain = {
  // Identity
  id: "trade",
  name: "Crypto Trading Intelligence",
  version: "5.0.0",

  // Intent routing — return 0-100 confidence
  canHandle(intent: string): number {
    // "analyze SOL" → 95
    // "audit contract" → 5
    // "open long BTC" → 99
  },

  // Brain tool implementations
  async think(params: { query: string }, ctx: BrainContext): Promise<ThinkResult> { },
  async scan(params: { criteria: string }, ctx: BrainContext): Promise<ScanResult> { },
  async execute(params: { action: string }, ctx: BrainContext): Promise<ExecuteResult> { },
  async watch(params: { what: string }, ctx: BrainContext): Promise<WatchResult> { },
  async protect(ctx: BrainContext): Promise<ProtectResult> { },
  async review(ctx: BrainContext): Promise<ReviewResult> { },

  // Pro tools — granular access (the 125 tools for trade domain)
  proTools: [
    { name: "ta_get_rsi", description: "...", params: {...}, execute: async (p) => {...} },
    { name: "ta_get_macd", description: "...", params: {...}, execute: async (p) => {...} },
    // ... all granular tools
  ],
};
```

### BrainContext (provided by brain runtime to every call)

```typescript
type BrainContext = {
  // User identity
  userId: string;
  scopedUserId: string;           // channel:user format

  // Memory (pre-loaded by brain)
  preferences: MemoryEntry[];     // user's domain preferences
  recentHistory: MemoryEntry[];   // recent interactions in this domain
  profile: DomainProfile | null;  // structured domain data (e.g., trading stats)

  // Platform
  memory: IMemoryAdapter;         // for reading/writing additional memory
  policies: Record<string, any>;  // trading_policies, etc.

  // Cross-domain (for protect/review)
  otherDomains?: DomainAdapter[]; // available when cross-domain query
};
```

---

## 6. Memory Architecture

### 6.1 Principle: Memory is a Platform Concern

Memory is NOT per-plugin. The platform provides memory as infrastructure. Plugins READ/WRITE to it with domain tags.

### 6.2 Existing Infrastructure (Unchanged)

| Component | Table/System | Purpose |
|-----------|-------------|---------|
| Semantic memory | `assistant_memory` | Vector embeddings, user-scoped, auto-extraction |
| Memory search | `search_memory()` RPC | pgvector semantic similarity |
| Memory dedup | `content_hash` + partial index | Prevents duplicates |
| Memory extraction | `memory_strategy` config | auto/aggressive/conservative |
| User scoping | `scoped_user_id` + RLS | Prevents cross-user leaks |
| Trading policies | `trading_policies` | Per-assistant risk limits |
| Conversation history | `assistant_messages` | Full transcript |
| Context compaction | `assistant_conversation_summaries` | Cached summaries |

### 6.3 New: Domain Tagging (1 migration)

Add `domain` column to `assistant_memory`:

```sql
ALTER TABLE assistant_memory ADD COLUMN domain TEXT;
CREATE INDEX idx_memory_domain ON assistant_memory(domain) WHERE domain IS NOT NULL;
```

Brain tools filter by domain:
- `search_memory(user, domain="trade")` → trade preferences only
- `search_memory(user)` → all domains (for cross-domain protect/review)

### 6.4 New: Structured Performance Tracking (1 migration)

```sql
CREATE TABLE domain_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scoped_user_id TEXT NOT NULL,
  domain TEXT NOT NULL,                  -- "trade", "predict", etc.

  -- Domain-specific structured data (flexible JSONB)
  event_type TEXT NOT NULL,              -- "trade_outcome", "prediction_result", "audit_finding"
  event_data JSONB NOT NULL,             -- domain-specific payload

  -- Brain accuracy tracking
  brain_confidence NUMERIC(5,2),         -- what the brain predicted (0-100)
  actual_outcome NUMERIC(5,2),           -- what actually happened

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Per-user, per-domain isolation
ALTER TABLE domain_performance ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_perf_domain ON domain_performance(scoped_user_id, domain);
```

Trade domain writes:
```json
{
  "event_type": "trade_outcome",
  "event_data": {
    "pair": "SOL/USDT",
    "side": "long",
    "entry": 145.20,
    "exit": 152.80,
    "pnl_pct": 5.23,
    "setup_type": "breakout",
    "exchange": "hyperliquid",
    "duration_hours": 18
  },
  "brain_confidence": 78,
  "actual_outcome": 85
}
```

Predict domain writes:
```json
{
  "event_type": "prediction_result",
  "event_data": {
    "market": "Will ETH hit $5k by March?",
    "position": "YES at 0.35",
    "resolved": true,
    "outcome": "YES"
  },
  "brain_confidence": 65,
  "actual_outcome": 100
}
```

### 6.5 Memory Adapter Interface

```typescript
interface IMemoryAdapter {
  // Search semantic memory
  search(query: string, opts?: { domain?: string; limit?: number }): Promise<MemoryEntry[]>;

  // Read specific memory
  read(key: string): Promise<string | null>;

  // Write to memory
  write(content: string, opts: { domain: string; category: string }): Promise<void>;

  // Structured performance data
  recordOutcome(event: DomainEvent): Promise<void>;
  getPerformance(domain: string, opts?: { since?: Date }): Promise<DomainEvent[]>;
  getStats(domain: string): Promise<DomainStats>;  // aggregated win rate, etc.
}
```

### 6.6 Two Implementations

#### OpenClawMemoryAdapter (for vanilla OpenClaw installs)

```typescript
// Uses OpenClaw's file-based memory tools
const adapter: IMemoryAdapter = {
  search(query, opts) {
    // → api.runtime.tools.createMemorySearchTool()
    // Domain filtering via query augmentation: "trade: {query}"
  },
  read(key) {
    // → api.runtime.tools.createMemoryGetTool()
  },
  write(content, opts) {
    // → Append to memory/YYYY-MM-DD.md with domain prefix
  },
  recordOutcome(event) {
    // → Append structured YAML block to memory/YYYY-MM-DD.md
  },
  getPerformance(domain) {
    // → Parse YAML blocks from memory files (basic but functional)
  },
  getStats(domain) {
    // → Compute from parsed events (basic aggregation)
  },
};
```

#### SupabaseMemoryAdapter (for Lucid SaaS)

```typescript
// Uses Supabase pgvector + structured tables
const adapter: IMemoryAdapter = {
  search(query, opts) {
    // → search_memory() RPC with p_scoped_user_id + domain filter
  },
  read(key) {
    // → SELECT from assistant_memory WHERE metadata->>key = key
  },
  write(content, opts) {
    // → upsert_memory() RPC with domain tag
  },
  recordOutcome(event) {
    // → INSERT into domain_performance
  },
  getPerformance(domain) {
    // → SELECT from domain_performance WHERE domain = domain
  },
  getStats(domain) {
    // → SQL aggregates: win rate, avg PnL, Kelly edge, best/worst
  },
};
```

### 6.7 Auto-Detection

```typescript
function resolveMemoryAdapter(env: RuntimeEnv): IMemoryAdapter {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
    return new SupabaseMemoryAdapter(env);
  }
  if (env.openclawApi) {
    return new OpenClawMemoryAdapter(env.openclawApi);
  }
  return new NoopMemoryAdapter(); // Stateless mode, brain still works
}
```

---

## 7. OpenClaw Compatibility

### 7.1 Bridge Plugin: memory-supabase

**Location:** `packages/openclaw-core/extensions/memory-supabase/`

**Purpose:** Any third-party OpenClaw plugin calling `memory_search`/`memory_get`/`memory_write` works in Lucid SaaS — the bridge translates file-based calls to Supabase queries.

```typescript
// extensions/memory-supabase/index.ts
export default {
  id: "memory-supabase",
  name: "Memory (Supabase)",
  kind: "memory",

  register(api) {
    api.registerTool((ctx) => [
      {
        name: "memory_search",
        description: "Search memory (Supabase-backed)",
        execute: async ({ query }) => {
          const results = await supabase.rpc("search_memory", {
            p_query_embedding: await embed(query),
            p_scoped_user_id: ctx.scopedUserId,
          });
          // Return in OpenClaw format (path + lines + snippet)
          return formatAsOpenClawResults(results);
        },
      },
      {
        name: "memory_get",
        description: "Read memory entry (Supabase-backed)",
        execute: async ({ path }) => {
          const result = await supabase
            .from("assistant_memory")
            .select("content")
            .eq("scoped_user_id", ctx.scopedUserId)
            .eq("metadata->>path", path)
            .single();
          return result.data?.content ?? "Not found";
        },
      },
      {
        name: "memory_write",
        description: "Write to memory (Supabase-backed)",
        execute: async ({ path, content }) => {
          await supabase.rpc("upsert_memory", {
            p_content: content,
            p_scoped_user_id: ctx.scopedUserId,
            p_external_user_id: ctx.externalUserId,
            p_channel_type: ctx.channelType,
            p_category: "context",
          });
          return "Saved";
        },
      },
    ], { names: ["memory_search", "memory_get", "memory_write"] });
  },
};
```

### 7.2 Compatibility Matrix

| Scenario | Memory | Tools | Works? |
|----------|--------|-------|--------|
| Our plugin → Claude Code / Cursor (standalone MCP) | None (stateless) | 7 brain tools | Yes |
| Our plugin → vanilla OpenClaw | File-based (OpenClawMemoryAdapter) | 7 brain tools | Yes |
| Our plugin → Lucid SaaS | Supabase (SupabaseMemoryAdapter) | 7 brain tools | Yes |
| 3rd party OpenClaw plugin → vanilla OpenClaw | File-based | Their tools | Already works |
| 3rd party OpenClaw plugin → Lucid SaaS | Supabase via memory-supabase bridge | Their tools | Yes |

---

## 8. Scaling Across All 18 Plugins

### 8.1 Tool Count: 7 Forever

Regardless of how many domains are installed, the agent sees exactly 7 tools.

```
1 domain (trade only):     7 tools
5 domains (trade+audit+predict+defi+observe):  7 tools
18 domains (everything):   7 tools
```

The brain runtime internally routes to the right domain(s) via `canHandle()`.

### 8.2 Domain Adapter Per Plugin

Each of the 18 plugins exports one domain adapter:

| Plugin | Domain ID | canHandle examples |
|--------|-----------|-------------------|
| lucid-trade | `trade` | "SOL", "long", "short", "position", "PnL" |
| lucid-audit | `audit` | "contract", "vulnerability", "reentrancy" |
| lucid-predict | `predict` | "prediction", "odds", "will X happen" |
| lucid-defi | `defi` | "yield", "LP", "stake", "farm", "protocol" |
| lucid-observability | `observe` | "Sentry", "error", "latency", "uptime" |
| lucid-compete | `compete` | "competitor", "market share", "pricing" |
| lucid-feedback | `feedback` | "NPS", "CSAT", "review", "sentiment" |
| lucid-hype | `hype` | "social", "campaign", "engagement", "growth" |
| lucid-invoice | `invoice` | "billing", "revenue", "subscription", "MRR" |
| lucid-meet | `meet` | "meeting", "transcript", "action items" |
| lucid-metrics | `metrics` | "analytics", "funnel", "retention", "DAU" |
| lucid-propose | `propose` | "RFP", "proposal", "bid", "pricing" |
| lucid-prospect | `prospect` | "lead", "outbound", "ICP", "pipeline" |
| lucid-recruit | `recruit` | "candidate", "interview", "hiring", "ATS" |
| lucid-seo | `seo` | "ranking", "keyword", "backlink", "SERP" |
| lucid-tax | `tax` | "capital gains", "tax loss", "1099" |
| lucid-veille | `veille` | "monitoring", "content", "publish", "RSS" |
| lucid-bridge | `bridge` | "Notion", "Linear", "Slack", "GitHub" |

### 8.3 Cross-Domain Intelligence

The killer feature no competitor can match:

- **`lucid_protect()`** polls ALL active domains simultaneously
  - Trade: position exposure, liquidation risk
  - Predict: market exposure, counterparty risk
  - DeFi: IL risk, protocol health
  - Cross-correlation: "Your SOL long + SOL DeFi LP = 2x SOL exposure"

- **`lucid_review()`** aggregates performance across domains
  - Combined PnL from trading + predictions + DeFi yields
  - Risk-adjusted returns across everything

- **`lucid_think("what's my overall crypto exposure?")`** spans trade + defi + predict

### 8.4 Developer Experience for New Domains

```bash
# 1. Create plugin
cp -r templates/skill-template skills/lucid-newdomain

# 2. Export domain adapter (duck typed, no imports needed)
# skills/lucid-newdomain/src/domain.ts
export const newDomain = {
  id: "newdomain",
  name: "New Domain Intelligence",
  canHandle(intent) { return intent.match(/keyword/) ? 90 : 0; },
  async think(params, ctx) { /* ... */ },
  async scan(params, ctx) { /* ... */ },
  async execute(params, ctx) { /* ... */ },
  async watch(params, ctx) { /* ... */ },
  async protect(ctx) { /* ... */ },
  async review(ctx) { /* ... */ },
  proTools: [ /* granular tools */ ],
};

# 3. Brain auto-discovers via OpenClaw plugin registration
# Memory, routing, formatting — all handled by brain runtime
```

---

## 9. Deployment Modes

### 9.1 Standalone MCP (Claude Code / Cursor)

```bash
npx @raijinlabs/trade
# or
npx @raijinlabs/brain --domains trade,predict
```

Runs as stdio MCP server. No memory (stateless). 7 tools.

### 9.2 OpenClaw Plugin (Self-Hosted)

```yaml
# openclaw config
plugins:
  - lucid-trade
  - lucid-predict
```

Memory via OpenClaw's file-based system. 7 tools. Works offline.

### 9.3 Lucid SaaS Platform

Worker loads all enabled domains for the workspace. Memory via Supabase. Full personalization. Cross-domain intelligence. 7 tools.

---

## 10. What Already Exists (Phase 1-3 Built)

The intelligence engine behind the trade domain is already implemented and tested:

| Component | File | Tests |
|-----------|------|-------|
| TA indicators (SMA, EMA, RSI, MACD, Bollinger, ATR, HV) | `src/intelligence/indicators.ts` | 24 passing |
| Trend detection, S/R levels, volatility regime | `src/intelligence/trend.ts` | 17 passing |
| Risk engine (fixed-%, Kelly, R:R, liquidation) | `src/intelligence/risk-engine.ts` | 17 passing |
| Backtester (SMA crossover, RSI mean-reversion) | `src/intelligence/backtester.ts` | 16 passing |
| 10 TA MCP tools | `src/tools/technical-analysis.ts` | 16 passing |
| Core types (Exchange, Position, Order, etc.) | `src/types/*.ts` | 3 passing |
| Adapter registry | `src/adapters/registry.ts` | 4 passing |
| **Total** | | **97 passing** |

This becomes the internal engine that `TradeDomainAdapter.think()` orchestrates.

---

## 11. Implementation Order

| # | What | Where | Depends On |
|---|------|-------|-----------|
| 1 | Brain runtime + 7 tool shell | `openclaw-core/extensions/brain/` | — |
| 2 | IMemoryAdapter + NoopAdapter | `openclaw-core/extensions/brain/` | #1 |
| 3 | TradeDomainAdapter | `lucid-trade/src/domain.ts` | #1 |
| 4 | OpenClawMemoryAdapter | `openclaw-core/extensions/brain/` | #2 |
| 5 | SupabaseMemoryAdapter | `openclaw-core/extensions/brain/` | #2 |
| 6 | memory-supabase bridge | `openclaw-core/extensions/memory-supabase/` | #5 |
| 7 | Migration: domain column | `LucidMerged/migrations/` | #5 |
| 8 | Migration: domain_performance | `LucidMerged/migrations/` | #5 |
| 9 | Exchange adapters (Hyperliquid first) | `lucid-trade/src/adapters/` | #3 |
| 10 | Second domain adapter (audit or predict) | Validates pattern | #1 |

---

## 12. Success Metrics (Revised)

| Metric | Senpi | Old Target | New Target |
|--------|-------|-----------|------------|
| Tools visible to agent | 44 | 125+ | **7** |
| Exchanges | 1 | 7+ | 7+ |
| Cross-domain intelligence | No | No | **Yes (18 domains)** |
| Memory / personalization | No | No | **Yes (Supabase + OpenClaw)** |
| OpenClaw plug-and-play | No | No | **Yes (both directions)** |
| TA engine | None | 10 tools | 10 tools (inside brain) |
| Risk framework | None | 8 tools | 8 tools (inside brain) |
| Backtesting | None | 5 strategies | 5 strategies (inside brain) |
| License | Proprietary | MIT | MIT |

The competitive moat is no longer tool count. It's **intelligence per interaction × personalization × cross-domain awareness**. Senpi gives you 44 wrenches. We give you a mechanic who knows your car.

---

## 13. Marketing & Positioning — "Bloomberg for AI Agents"

### The Bloomberg Parallel

Bloomberg didn't win by having more data than Reuters. Bloomberg won by making data **usable**. One terminal. One experience. Personalized to each trader's workflow.

That's exactly what Lucid Brain does for AI agents:

| Bloomberg Terminal | Lucid Brain |
|-------------------|------------|
| One terminal for all financial data | 7 tools for all crypto intelligence |
| Learns your layout and preferences | Learns your trading style and edge |
| Works across all asset classes | Works across 18 domains, 7+ exchanges |
| $24k/year (premium positioning) | Free/MIT (growth) → SaaS premium on Lucid platform |
| "Professional traders use Bloomberg" | "Smart agents use Lucid Brain" |

The key difference: Bloomberg gates with price. We gate with intelligence — the free version works, but Lucid SaaS adds memory, cross-domain awareness, and personalization. Open-source brain = growth engine. Platform = business.

### Tagline Candidates

| Tagline | Why It Works |
|---------|-------------|
| **"7 tools. Complete intelligence."** | Contrarian. Implies everyone else is bloated. |
| **"Ask. Don't configure."** | Speaks to UX frustration with tool-heavy approaches. |
| **"Your AI trading brain."** | Simple, direct, memorable. |
| **"Intelligence, not tools."** | Directly positions against Senpi's 44-tool approach. |
| **"The last trading MCP you'll need."** | Bold. Bloomberg-level confidence. |

### The 5 Marketing Angles

#### Angle 1: The Number "7" (Contrarian Positioning)
Every AI company brags about MORE tools. We brag about FEWER:

> **"Senpi has 44 tools. We have 7. Ours are smarter."**

This is contrarian and memorable. The entire AI industry is in an arms race for feature count. We go the opposite direction — exactly how Bloomberg won against Reuters.

#### Angle 2: "Ask, Don't Configure" (UX Story)

> **"Don't learn 44 APIs. Just ask."**
>
> `"Should I buy SOL?"` → Complete analysis, personalized to you.
> One call. One answer. Zero configuration.

The demo writes itself. Show Senpi requiring 8 tool calls to build an analysis. Show Lucid doing it in one.

#### Angle 3: "Your AI Gets Smarter" (Memory Story)

> **"Your AI gets smarter with every trade."**
>
> Day 1: Generic analysis.
> After 10 trades: Knows your edge, adjusts sizing.
> After 100 trades: Knows you better than you know yourself.
>
> Senpi's tools forget you after every call.

This is the stickiness play. Once the brain knows you, switching costs are high — not because of lock-in, but because the personalization is genuinely valuable.

#### Angle 4: "Protect Me" (Cross-Domain Story)

> **Two words: "Protect me."**
>
> The brain checks your leveraged positions, your DeFi LP exposure, your prediction market bets, your tax implications — simultaneously. Finds the correlation risk you didn't see: your SOL long + SOL LP = 2x unhedged exposure.
>
> No one else does this. Period.

This is the feature no competitor can copy without rebuilding their entire architecture. Senpi is Hyperliquid-only. Every other trading MCP is single-domain. Cross-domain risk awareness is a moat.

#### Angle 5: Open Source + Universal (Distribution Story)

> **"MIT licensed. Works with Claude, GPT, Gemini, Llama, or your local model."**
>
> Senpi locks you into their platform + Hyperliquid.
> We work everywhere, with everything, on any exchange.

Open source = trust. MIT license = adoption. The brain works standalone, in OpenClaw, or on Lucid's SaaS. No lock-in, but the SaaS is where the magic happens (memory, cross-domain, personalization).

### Visual Identity

Bloomberg-level: premium, professional, data-dense but clean.

```
┌──────────────────────────────────────────────────────┐
│  L U C I D  B R A I N                          v5.0 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│  "7 tools. Complete intelligence."                   │
│                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  THINK  │ │  SCAN   │ │ EXECUTE │ │  WATCH  │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌──────────────────────┐   │
│  │ PROTECT │ │ REVIEW  │ │    PRO MODE ⚡       │   │
│  └─────────┘ └─────────┘ └──────────────────────┘   │
│                                                      │
│  18 domains · 7 exchanges · Learns from every trade  │
│  MIT licensed · Works with any LLM                   │
└──────────────────────────────────────────────────────┘
```

### Go-To-Market Strategy

1. **Launch**: Open-source `@lucid-skills/brain` with trade domain. Free, standalone MCP. "7 tools" messaging.
2. **Demo**: Side-by-side video — Senpi (8 tool calls, 30 seconds) vs Lucid Brain (1 call, instant). The demo IS the marketing.
3. **Community**: OpenClaw plugin marketplace. Anyone can build a domain adapter. "npm create lucid-domain" scaffold.
4. **SaaS upsell**: "Brain works free. Memory makes it yours." Lucid platform adds personalization, cross-domain, team features.
5. **Enterprise**: "Bloomberg for your trading desk's AI agents." Multi-user, compliance, audit trail, role-based access.
