# Impermanent Loss Calculator Reference

Comprehensive impermanent loss formulas, scenarios, and worked examples for liquidity provider positions.

## Core IL Formula

For a constant-product AMM (x * y = k), such as Uniswap V2, PancakeSwap, Raydium:

```
Given:
  P0 = initial price ratio of Token A to Token B
  P1 = current price ratio of Token A to Token B
  r  = P1 / P0  (relative price change)

Impermanent Loss:
  IL = 2 * sqrt(r) / (1 + r) - 1

IL is expressed as a decimal (multiply by 100 for percentage).
IL is always <= 0 (it is always a loss relative to holding).
```

## IL Lookup Table

| Price Change (r) | IL % | Description |
|-------------------|------|-------------|
| 1.0x (no change) | 0.00% | No impermanent loss |
| 1.25x (25% up) | -0.60% | Minimal IL |
| 1.5x (50% up) | -2.02% | Small IL |
| 2.0x (100% up) | -5.72% | Moderate IL |
| 3.0x (200% up) | -13.40% | Significant IL |
| 4.0x (300% up) | -20.00% | Large IL |
| 5.0x (400% up) | -25.46% | Very large IL |
| 10.0x (900% up) | -42.50% | Extreme IL |
| 0.5x (50% down) | -5.72% | Same IL as 2x up |
| 0.25x (75% down) | -20.00% | Same IL as 4x up |
| 0.1x (90% down) | -42.50% | Same IL as 10x up |

Note: IL is symmetric with respect to the ratio. A 2x increase produces the same IL as a 2x decrease (0.5x).

## Value Comparison: LP vs HODL

### LP Value Formula

```
Given initial deposit of equal values:
  V0 = initial total value (e.g., $1,000 = $500 Token A + $500 Token B)

After price change r:
  V_LP = V0 * 2 * sqrt(r) / (1 + r)  [before fees]

  V_HODL = V0 * (1 + r) / 2  [value if just held the tokens]

  IL_USD = V_LP - V_HODL
  IL_PCT = IL_USD / V_HODL * 100
```

### Worked Example: ETH/USDC LP

```
Initial:
  Deposit $10,000 into ETH/USDC LP
  = $5,000 ETH (2.5 ETH at $2,000) + $5,000 USDC

Scenario: ETH doubles to $4,000

  r = 4000 / 2000 = 2.0

  IL = 2 * sqrt(2) / (1 + 2) - 1
     = 2 * 1.4142 / 3 - 1
     = 0.9428 - 1
     = -0.0572 = -5.72%

  HODL Value:
    2.5 ETH * $4,000 = $10,000
    5,000 USDC = $5,000
    Total HODL = $15,000

  LP Value (before fees):
    $15,000 * (1 - 0.0572) = $14,142

  IL in USD: $14,142 - $15,000 = -$858

  If LP earned $1,000 in trading fees:
    Net LP Value: $14,142 + $1,000 = $15,142
    Net vs HODL: +$142 (fees offset the IL)
```

## IL for Different Pool Types

### Concentrated Liquidity (Uniswap V3)

Concentrated liquidity amplifies both returns AND impermanent loss.

```
For a position concentrated between price range [P_low, P_high]:

  Concentration Factor = sqrt(P_high / P_low) / (sqrt(P_high / P_low) - 1)

  IL_concentrated ~ IL_standard * Concentration Factor

  Example:
    Full range: IL = -5.72% at 2x price change
    +/-10% range: Concentration Factor ~ 10x
    IL_concentrated ~ -57.2% if price moves outside range

  IMPORTANT: If price moves outside the concentrated range:
    - Position becomes 100% one token
    - Position stops earning fees
    - IL can exceed IL of a full-range position significantly
```

### Stablecoin Pairs

```
For stablecoin/stablecoin pairs (e.g., USDC/USDT):
  Price ratio stays very close to 1.0
  r typically ranges from 0.998 to 1.002

  At r = 1.001: IL = -0.00005% (essentially zero)

  Stablecoin LPs are nearly IL-free, making fee income almost pure profit.
  Main risk: one stablecoin depegs significantly.
```

### Weighted Pools (Balancer)

For pools with non-50/50 weights (e.g., 80/20):

```
For a pool with weights w1 and w2 (w1 + w2 = 1):

  IL = (r^w1 * 1^w2) / (w1 * r + w2 * 1) - 1

  For 80/20 pool with 2x price change:
    IL = (2^0.8 * 1^0.2) / (0.8 * 2 + 0.2) - 1
       = 1.7411 / 1.8 - 1
       = -0.0327 = -3.27%

  Compare to 50/50: -5.72%
  80/20 pools have LESS IL because less capital is in the volatile asset.
```

## Multi-Token Scenarios

### Both Tokens Change Price

```
When both Token A and Token B change price:

  r = (P_A1 / P_A0) / (P_B1 / P_B0)

  Only the RELATIVE price change matters, not absolute changes.

  Example:
    Token A goes from $100 to $150 (1.5x)
    Token B goes from $50 to $100 (2x)
    r = 1.5 / 2.0 = 0.75

    IL = 2 * sqrt(0.75) / (1 + 0.75) - 1
       = 2 * 0.8660 / 1.75 - 1
       = -0.0102 = -1.02%

  If both tokens increase by the same percentage -> r = 1.0 -> IL = 0%
```

### Token Goes to Zero

```
If one token goes to zero (r -> infinity or r -> 0):
  IL approaches -100% (total loss relative to holding)

  In practice:
    LP position becomes 100% of the worthless token
    All value of the good token has been exchanged for the bad token
    This is why LP with highly speculative tokens is extremely risky
```

## Break-Even Analysis

### Fee Income Needed to Offset IL

```
For a given IL%, calculate the minimum APY from fees needed:

  Required APY = |IL%| / (holding_period_in_years)

  Or for a target holding period:
  Required Daily Fee Income = |IL_USD| / days_held

Examples:
  IL = -5.72% (2x price change), held 1 year:
    Required APY = 5.72% / 1 = 5.72%

  IL = -5.72%, held 6 months:
    Required APY = 5.72% / 0.5 = 11.44%

  IL = -5.72%, held 3 months:
    Required APY = 5.72% / 0.25 = 22.88%

Key insight: Shorter holding periods require much higher fees to offset IL.
```

### Break-Even Price Change for Given APY

```
Given an LP earning fees_pct per year:

  Maximum tolerable IL = fees_pct * holding_period_years

  Solve for r:
    2 * sqrt(r) / (1 + r) - 1 = -max_IL
    This requires numerical solving (no closed-form for r)

  Approximation for small IL:
    max_r ~ 1 + 2 * sqrt(max_IL)

  Example: LP earning 20% APY, held 1 year
    Max tolerable IL = 20%
    max_r = 1 + 2 * sqrt(0.20) ~ 1.89
    Token A can increase ~89% (or decrease ~47%) before IL exceeds fee income
```

## IL Monitoring Template

```
Position: [Token A] / [Token B] LP on [Protocol]
Chain: [Chain]
Deposited: [Date] ($[Value])

Price at Entry:
  Token A: $[price_A0]
  Token B: $[price_B0]
  Ratio: [price_A0 / price_B0]

Current Prices:
  Token A: $[price_A1]
  Token B: $[price_B1]
  Ratio: [price_A1 / price_B1]

Price Change:
  r = [current_ratio / entry_ratio]

Impermanent Loss:
  IL% = [calculated]
  IL$ = $[calculated]

Fee Income:
  Fees Earned: $[amount]
  Fee APY: [calculated]%

Net Position:
  LP Value: $[current_LP_value]
  HODL Value: $[what_holding_would_be_worth]
  Net vs HODL: $[difference] ([percentage]%)

Assessment:
  [PROFITABLE / BREAK-EVEN / UNDERWATER]
  [Recommendation: stay, exit, or rebalance]
```

## IL Simulation for Decision Making

Before entering an LP position, simulate outcomes:

```
function simulateIL(initial_value, price_scenarios):
    results = []
    for each scenario in price_scenarios:
        r = scenario.price_change_ratio
        il_pct = 2 * sqrt(r) / (1 + r) - 1
        lp_value = initial_value * 2 * sqrt(r) / (1 + r)
        hodl_value = initial_value * (1 + r) / 2
        il_usd = lp_value - hodl_value

        results.push({
            scenario: scenario.label,
            price_change: (r - 1) * 100 + "%",
            il_pct: il_pct * 100 + "%",
            il_usd: il_usd,
            lp_value: lp_value,
            hodl_value: hodl_value,
            required_apy_1yr: abs(il_pct) * 100 + "%"
        })

    return results

# Standard scenarios to simulate:
scenarios = [
    { label: "25% drop",  price_change_ratio: 0.75 },
    { label: "50% drop",  price_change_ratio: 0.50 },
    { label: "No change", price_change_ratio: 1.00 },
    { label: "50% up",    price_change_ratio: 1.50 },
    { label: "2x",        price_change_ratio: 2.00 },
    { label: "3x",        price_change_ratio: 3.00 },
    { label: "5x",        price_change_ratio: 5.00 }
]
```