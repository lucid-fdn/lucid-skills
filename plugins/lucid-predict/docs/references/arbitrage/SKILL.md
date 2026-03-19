---
name: arbitrage
description: "Cross-platform arbitrage detection for prediction markets — find mispricings across Polymarket, Manifold, and Kalshi"
---

# Arbitrage Detection

Detect cross-platform arbitrage opportunities in prediction markets. When the same event is priced differently on two platforms, a guaranteed profit may exist.

## Brain Tool

| Tool | Use For |
|------|---------|
| `lucid_arbitrage` | Full arbitrage scan across all platforms — matching, spread calculation, profit estimation |

## Arbitrage Concept

Arbitrage exists when you can buy YES on Platform A and NO on Platform B (or vice versa) for a combined cost of less than $1.00. Since one of YES or NO must resolve to $1.00, the difference is guaranteed profit.

**Example:**
- Platform A: YES at $0.40
- Platform B: NO at $0.50
- Combined: $0.90 → Guaranteed profit: $0.10 (11.1% return)

## How `lucid_arbitrage` Works

1. **Requires >= 2 platforms** — returns error if only 1 adapter is registered
2. **Fetches markets** from all platforms (by query or trending)
3. **Matches markets** across platforms using title similarity (`src/math/correlation.ts`)
4. **Checks both directions**: YES_A + NO_B and YES_B + NO_A
5. **Filters** by minimum spread threshold (default 3%)
6. **Returns** opportunities sorted by profit% descending

## Title Matching Algorithm (`src/math/correlation.ts`)

```
1. Clean both titles: lowercase, remove special characters, trim
2. Exact match → similarity = 1.0
3. Word overlap: shared_words / max(words_in_A, words_in_B)
4. Match if similarity >= 0.60
```

## Arbitrage Calculation (`src/math/correlation.ts`)

```
combinedCost = yesPrice + noPrice
if combinedCost >= 1.0: no arbitrage
profit = 1.0 - combinedCost
profitPct = (profit / combinedCost) x 100
```

## Minimum Spread Threshold

Default: **3%** (configurable via `PREDICT_MIN_SPREAD_PCT`)

Spreads below this are unlikely profitable after fees, slippage, and execution delay.

## Risk Factors

| Risk | Description |
|------|-------------|
| **Execution delay** | Prices may change between placing the two legs |
| **Liquidity** | One platform may lack depth to fill at the quoted price |
| **Resolution risk** | Platforms may resolve the same event differently |
| **Fee structures** | Trading fees, withdrawal fees reduce net profit |
| **Capital lockup** | Funds locked until resolution (weeks/months) |

## Best Practices

1. **Verify the match** — automated title matching can produce false positives
2. **Check liquidity** on both sides before executing
3. **Account for all fees** — trading, withdrawal, and spread costs
4. **Execute simultaneously** — minimize the window for price changes
5. **Start small** — test with small amounts before scaling
