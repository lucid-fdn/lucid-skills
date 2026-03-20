# Smart Skill System — Design & Competitive Analysis

## 1. BankrBot Skills Audit

### What They Have (17 skills)

| Skill | Quality | What It Does |
|-------|---------|-------------|
| **bankr** | Excellent | Full trading agent: swaps, limit orders, DCA, TWAP, NFTs, leverage, token deployment, Polymarket. Async job API. Multi-chain (Base, ETH, Polygon, Solana, Unichain) |
| **bankr-signals** | Excellent | Transaction-verified trading signals. Publish trades with TX hash proof. Leaderboard, webhooks, copy trading. EIP-191 signatures. |
| **quicknode** | Excellent | Multi-chain RPC with x402 pay-per-request (no account needed). Token API, NFT API, Solana DAS. 77+ chains. |
| **neynar** | Good | Full Farcaster API: post, read, search, react, follow. Channels, frames. |
| **siwa** | Good | Agent auth via wallet message signing (Sign-In With Agent) |
| **erc-8004** | Good | Agent identity registry with NFTs |
| **botchan** | Decent | On-chain agent messaging |
| **endaoment** | Decent | Charitable giving + 501(c)(3) lookups |
| **ens-primary-name** | Decent | ENS domain management |
| **hydrex** | Decent | Liquidity pools + voting |
| **clanker** | Minimal | Token launcher |
| **qrcoin** | Minimal | QR code auctions |
| **veil** | Minimal | Privacy transactions |
| **yoink** | Minimal | Token game |
| **base** | Placeholder | Empty |
| **zapper** | Placeholder | Empty |
| **onchainkit** | Minimal | React components reference |

### BankrBot Strengths
1. **Pure simplicity**: Just SKILL.md + optional references/. No TypeScript, no build, no MCP. The agent reads the file and follows instructions.
2. **API-first**: Skills teach the agent to call REST APIs via curl/fetch. No tool framework overhead.
3. **Transaction verification**: bankr-signals proves trades happened on-chain. No fake performance.
4. **x402 integration** (quicknode): Pay-per-request without accounts — ideal for autonomous agents.
5. **Heartbeat pattern**: Skills include periodic check routines for autonomous operation.

### BankrBot Weaknesses
1. **No type safety**: Skills are just markdown — no input/output validation, no schemas.
2. **No structured output**: Results come back as raw text, not typed JSON. Agent has to parse.
3. **No brain layer**: No structured analysis (Verdict/Score/Evidence pattern). Just raw API calls.
4. **No multi-tenancy**: No per-org installation, no activation governance, no plan limits.
5. **No caching**: Every skill read loads the full markdown into context every time.
6. **Shell-based**: 68% Shell scripts. Not production-grade for a SaaS platform.
7. **No progressive disclosure**: The entire SKILL.md is loaded or nothing. No levels.
8. **Fragile API coupling**: Skills hardcode API URLs and curl commands. If API changes, skill breaks.

---

## 2. Anthropic's Agent Skills Architecture (the new standard)

### Key Innovations

**Progressive Disclosure (3 levels)**:
- Level 1: Metadata (~100 tokens) — always loaded, discovery only
- Level 2: Instructions (<5K tokens) — loaded when triggered
- Level 3: Resources — loaded as needed, scripts executed without loading code into context

**Why this matters**: You can install 100 skills with only ~10K token overhead. Skills are loaded on-demand, not all-at-once.

**Filesystem as context**: Skills exist as directories. Agent reads files via bash on demand. Script outputs enter context, not script code. Reference files are accessed only when referenced.

**KV-cache aware**: Metadata is a stable prefix. Loading happens via append-only reads. Cache-friendly.

### What Anthropic Gets Right
1. **~100 tokens per skill at rest** (just metadata in system prompt)
2. **On-demand loading** — only triggered skills consume context
3. **Scripts run without context cost** — only output matters
4. **Composable** — combine multiple skills per task
5. **Same architecture across API, CLI, SDK, and claude.ai**

---

## 3. Manus.im Context Engineering (state of the art)

### Key Innovations

1. **Tool masking over removal**: Don't dynamically add/remove tools (kills KV cache). Instead, mask unavailable tools at the logit level using name prefixes (`browser_*`, `shell_*`).
2. **File system as memory**: Externalize agent memory to files. Context compression is lossy, but files are lossless.
3. **Todo.md recitation**: Agent maintains a `todo.md` that gets appended to context end, pushing objectives into the model's recent attention span. Fights "lost-in-the-middle".
4. **Leave failures visible**: Don't clean up errors from context. They teach the model to avoid similar mistakes.
5. **KV-cache economics**: Cached tokens cost 0.30 USD/MTok vs 3 USD/MTok uncached — 10x difference. Architecture should maximize cache hits.

---

## 4. Where Lucid Stands Today

| Dimension | BankrBot | Anthropic | Manus | **Lucid** |
|-----------|----------|-----------|-------|-----------|
| Skill format | SKILL.md only | SKILL.md + scripts + resources | Custom | SKILL.md + MCP servers |
| Loading | All-or-nothing | Progressive (3 levels) | State machine | All-or-nothing |
| Context cost | Full file per skill | ~100 tok rest, <5K active | Minimal (masked) | Full file per skill |
| Tool execution | curl/REST | bash + scripts | Masked tools | MCP (in-process) |
| Structured output | None | Script output | JSON | MCP result JSON |
| Brain layer | None | None | None | **Yes (Verdict/Score)** |
| Multi-tenancy | None | Org-wide (API) | N/A | **3-tier governance** |
| Caching | None | KV-cache aware | KV-cache optimized | **60s in-memory** |
| Tool count | 0 (API calls only) | 4 pre-built | ~50 | **27 built-in + 19 plugins** |
| Autonomy | Heartbeat pattern | Agent-driven | Fully autonomous | Heartbeat + polling |

### Lucid's Unique Advantages
1. **Brain layer**: Structured analysis with Verdicts — no competitor has this
2. **3-tier governance**: catalog → org install → assistant activate — enterprise-ready
3. **In-process MCP**: 1-5ms tool calls vs 50-200ms HTTP
4. **Dual execution**: embedded (fast) + MCPGate HTTP (extensible)
5. **Tool result caching**: Per-tool TTLs, LRU eviction

### Lucid's Gaps vs Competition
1. **No progressive disclosure**: All skills load fully into context — wasteful
2. **No dynamic tool masking**: All 27+ tools sent every request — bloated
3. **No file-as-memory**: Skills are DB rows, not files. No script execution.
4. **No KV-cache optimization**: System prompt changes per-request (memories, history)
5. **SKILL.md is loaded fully**: No Level 1/2/3 split

---

## 5. Smart Skill System Design — 300% Ahead

### Design Principle: **Progressive Context, Structured Intelligence**

Combine Anthropic's progressive disclosure + Manus's context engineering + Lucid's brain layer into something none of them have.

### Innovation 1: Three-Level Skill Loading (adopt from Anthropic)

```
Level 1: Metadata (~100 tokens per skill)
  Always in system prompt. Just name + description + trigger patterns.

Level 2: Instructions (<2K tokens)
  Loaded when the LLM mentions the skill or user query matches trigger.
  Compact workflow guidance. No tool definitions (those are in tools[]).

Level 3: Deep Knowledge (unlimited)
  Agent reads from references/ on demand. Never pre-loaded.
  Scripts execute and return output only.
```

**Impact**: 20 skills at rest = ~2K tokens (vs current ~30K). 10x context reduction.

**Implementation**:
- Level 1 metadata goes in `plugin.json` (already created)
- Level 2 is `docs/SKILL.md` (already exists, keep compact)
- Level 3 is `docs/references/` (already exists)
- Worker's `fetchActiveSkills()` returns Level 1 only. Level 2 loaded on-demand by the agent.

### Innovation 2: Dynamic Tool Surface (adopt from Manus)

Instead of sending all 27 tools every request, send only the tools relevant to the user's query.

```
User: "What's my balance?"
  → Tools sent: get_portfolio, wallet_balance, get_price (3 tools, not 27)

User: "Swap 10 USDC for SOL"
  → Tools sent: dex_get_quote, dex_swap, risk_check, get_price, get_trading_policy (5 tools)

User: "Schedule a daily report"
  → Tools sent: cron_schedule, cron_list (2 tools)
```

**How**: Use the first LLM call (fast model) to classify intent → select tool subset → run agent with minimal tools. Or use embedding similarity between query and tool descriptions.

**Impact**: Fewer tools = faster LLM response (less prefill) + better tool selection accuracy.

### Innovation 3: Skill-Triggered Tool Injection

Skills should declare which tools they need. When a skill activates, its tools are injected. When inactive, its tools are absent.

```json
// plugin.json
{
  "id": "lucid-trade",
  "tools": ["lucid_think", "lucid_scan", "lucid_protect", "lucid_review", "lucid_pro"],
  "requiredBuiltins": ["get_price", "get_portfolio", "dex_swap", "risk_check"],
  "triggerPatterns": ["trade", "swap", "buy", "sell", "position", "portfolio"]
}
```

When the user says "analyze BTC for a trade", the skill triggers, and ONLY lucid-trade's tools + its required builtins are sent to the LLM. All other tools are excluded.

**Impact**: Tool bloat eliminated. Each request gets exactly the tools it needs.

### Innovation 4: Brain Layer as Standard (Lucid's unique advantage)

No competitor has structured analysis output. Standardize it:

```typescript
interface BrainResult<V extends string> {
  verdict: V                    // Domain-specific enum
  score: number                 // 0-100 calibration
  confidence: number            // 0-1 statistical confidence
  evidence: Record<string, unknown>  // Raw data backing the verdict
  reasoning: string[]           // Chain of reasoning steps
  action?: {                    // Recommended next step
    tool: string
    params: Record<string, unknown>
  }
}
```

Every brain-layer plugin outputs this format. The agent can chain: `brain_result.action.tool` → auto-execute the recommended tool.

### Innovation 5: Autonomous Skill Chains

Skills can declare dependencies and automatic chains:

```json
{
  "chains": {
    "before_trade": ["risk_check", "get_trading_policy"],
    "after_trade": ["publish_signal", "update_portfolio_snapshot"],
    "periodic": {
      "interval": "15m",
      "steps": ["check_open_positions", "update_stop_losses"]
    }
  }
}
```

The worker automatically enforces pre-trade safety checks and post-trade bookkeeping. No relying on the LLM to remember.

### Innovation 6: Skill Marketplace with Verified Providers

Like BankrBot's signals but for skills:

```
Provider publishes skill → Lucid verifies (tests, audits) → Catalog
  → Users install → Usage metrics tracked → Provider earns revenue share
```

Each skill has:
- Verified badge (Lucid-tested)
- Usage count
- Success rate (tool calls that returned valid results)
- User ratings
- Revenue share (if premium)

### Innovation 7: Context-Stable System Prompt (adopt from Manus)

Structure the system prompt for maximum KV-cache hits:

```
[STABLE PREFIX — never changes]
  Agent identity
  Core safety rules
  Skill metadata (Level 1)

[SEMI-STABLE — changes per-assistant, not per-request]
  Active tool list
  Assistant persona

[VARIABLE — changes per-request]
  Memories (if any)
  Conversation summary (if any)
  Recent turns
```

The stable prefix gets cached by Anthropic/OpenAI. Variable content is append-only. Cache hit rate goes from ~0% to ~80%.

---

## 6. Implementation Priority

| Innovation | Effort | Impact | Priority |
|-----------|--------|--------|----------|
| 1. Three-level loading | Medium | High (10x context reduction) | P0 |
| 2. Dynamic tool surface | Medium | High (fewer tools = faster) | P0 |
| 3. Skill-triggered tools | Low | Medium (cleaner architecture) | P1 |
| 4. Brain layer standard | Low | Medium (already exists, standardize) | P1 |
| 5. Autonomous chains | High | High (true autonomy) | P2 |
| 6. Skill marketplace | High | High (business value) | P2 |
| 7. Context-stable prompt | Low | Medium (cache savings) | P1 |

**Phase 1 (next sprint)**: Innovations 1, 2, 7 — immediate latency + context improvement
**Phase 2 (following sprint)**: Innovations 3, 4 — cleaner architecture
**Phase 3 (future)**: Innovations 5, 6 — autonomous operations + marketplace

---

## 7. Competitive Position After Implementation

| Dimension | BankrBot | Anthropic | Manus | **Lucid (after)** |
|-----------|----------|-----------|-------|--------------------|
| Context efficiency | Poor | Excellent | Excellent | **Excellent** |
| Structured intelligence | None | None | None | **Excellent (brain layer)** |
| Tool management | None | Static | Masked | **Dynamic + skill-triggered** |
| Governance | None | Org-wide | None | **3-tier + marketplace** |
| Autonomy | Heartbeat | Agent-driven | Full | **Chains + heartbeat** |
| Ecosystem | 17 skills | 4 pre-built | Closed | **20 plugins + community** |

**Lucid would be the only platform with**: progressive disclosure + brain layer + dynamic tools + 3-tier governance + autonomous chains. That's not 300% ahead — that's a different category.
