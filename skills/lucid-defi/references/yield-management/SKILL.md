---
name: yield-management
description: "DeFi yield farming, position tracking, impermanent loss calculation, health factor monitoring, and portfolio optimization"
---

# Yield Management

Track DeFi yield positions across protocols, calculate impermanent loss, monitor health factors for lending positions, discover yield opportunities, assess risk, and optimize portfolio allocation between yield sources.

## Yield Management Procedure

When the user asks about DeFi yields or positions, follow this procedure:

1. **Identify the request type**:

| Request Type | Action | Key Output |
|-------------|--------|------------|
| "Track my positions" | Position Overview | All DeFi positions with current yields |
| "What's my IL?" | IL Calculation | Impermanent loss for LP positions |
| "Is my lending safe?" | Health Factor Check | Liquidation risk assessment |
| "Find best yields" | Opportunity Discovery | Ranked yield opportunities |
| "Compare protocols" | Protocol Comparison | Side-by-side yield and risk analysis |
| "Optimize my portfolio" | Portfolio Rebalancing | Yield vs risk optimization |

2. **Fetch position data** from on-chain sources and protocol APIs.

3. **Apply calculations** from reference files.

4. **Present results** with risk warnings and actionable recommendations.

## Position Types

### Supported DeFi Position Types

| Type | Description | Yield Source | Key Risk |
|------|-------------|-------------|----------|
| Lending | Supply assets to lending protocol | Interest from borrowers | Utilization spike, protocol risk |
| Borrowing | Borrow against collateral | Leverage (indirect) | Liquidation if health factor < 1 |
| LP (Liquidity Provision) | Provide liquidity to DEX pool | Trading fees + incentives | Impermanent loss |
| Staking | Lock tokens for network security | Protocol inflation / rewards | Lock-up period, slashing |
| Farming | LP + stake LP tokens for rewards | Incentive tokens | IL + reward token price decline |
| Vault | Deposit into auto-compounding vault | Strategy-dependent | Smart contract risk |
| Perps | Perpetual futures positions | Funding rate | Liquidation, funding rate flip |
| Options | Options strategies (covered calls, etc.) | Premiums | Assignment risk, time decay |

### Position Data Schema

| Field | Type | Description |
|-------|------|-------------|
| protocol | string | Protocol name (Aave, Uniswap, etc.) |
| chain | string | Blockchain |
| type | string | Position type (lending, LP, etc.) |
| tokens | array | Token(s) in position |
| deposited_value_usd | number | Value at time of deposit |
| current_value_usd | number | Current market value |
| apy_current | number | Current annualized yield % |
| apy_7d_avg | number | 7-day average APY |
| rewards_earned_usd | number | Total rewards earned |
| health_factor | number | For lending/borrowing positions (null otherwise) |
| il_percentage | number | For LP positions (null otherwise) |
| entry_date | timestamp | When position was opened |
| last_harvest | timestamp | Last reward claim date |

## Yield Calculations

### APY vs APR

```
APR (Annual Percentage Rate):
  Simple interest, not compounded
  APR = (reward_per_period / principal) * periods_per_year * 100

APY (Annual Percentage Yield):
  Compound interest
  APY = ((1 + reward_per_period / principal) ^ periods_per_year - 1) * 100

Conversion:
  APY = (1 + APR / n) ^ n - 1
  APR = n * ((1 + APY) ^ (1/n) - 1)

  Where n = compounding periods per year
    Daily compounding: n = 365
    Weekly: n = 52
    Monthly: n = 12

Example:
  APR = 20%, daily compounding
  APY = (1 + 0.20/365)^365 - 1 = 22.13%
```

### Yield Projection

```
function projectYield(principal, apy, days):
    daily_rate = (1 + apy/100) ^ (1/365) - 1
    projected_value = principal * (1 + daily_rate) ^ days
    yield_earned = projected_value - principal

    return {
        projected_value: projected_value,
        yield_earned: yield_earned,
        yield_pct: (yield_earned / principal) * 100,
        daily_yield: principal * daily_rate,
        monthly_yield: principal * ((1 + daily_rate)^30 - 1)
    }
```

## Impermanent Loss

See `references/il-calculator.md` for detailed formulas, scenarios, and worked examples.

### Quick IL Formula

```
Given initial price ratio r0 and current price ratio r1:
  r = r1 / r0  (relative price change)

  IL = 2 * sqrt(r) / (1 + r) - 1

  IL is always negative (representing a loss relative to holding)
  IL = 0% when r = 1 (no price change)
  IL = -5.72% when r = 2 (one token doubles)
  IL = -25.00% when r = 4 (one token quadruples)
  IL = -100% when r -> infinity (one token goes to zero or infinity)
```

### Net LP Return

```
Net LP Return = Trading Fees Earned + Incentive Rewards + IL (negative)

Profitable LP: fees + rewards > |IL|
Unprofitable LP: fees + rewards < |IL|

Break-Even APY = |IL%| / holding_period_in_years
  Example: IL = -5%, held for 6 months
  Break-Even APY = 5% / 0.5 = 10% APY needed from fees to break even
```

## Health Factor Monitoring

For lending/borrowing positions, health factor determines liquidation risk.

### Health Factor Formula

```
Health Factor = (Collateral Value * Liquidation Threshold) / Borrow Value

  Collateral Value = sum(collateral_amount[i] * price[i] * collateral_factor[i])
  Borrow Value = sum(borrow_amount[i] * price[i])

  Health Factor > 1.0:  Safe (no liquidation)
  Health Factor = 1.0:  Liquidation threshold (can be liquidated)
  Health Factor < 1.0:  Undercollateralized (will be liquidated)
```

### Liquidation Thresholds by Protocol

| Protocol | Chain | Typical LTV | Liquidation Threshold | Liquidation Penalty |
|----------|-------|------------|----------------------|-------------------|
| Aave V3 | Multi-chain | 80% | 82.5% | 5% |
| Compound V3 | Ethereum | 80% | 83% | 5% |
| Spark (MakerDAO) | Ethereum | 80% | 83% | 13% |
| Solend | Solana | 75% | 80% | 5% |
| Marginfi | Solana | 80% | 85% | 5% |

### Health Factor Alerts

| Health Factor | Risk Level | Alert | Recommended Action |
|--------------|-----------|-------|-------------------|
| > 2.0 | Safe | None | Monitor weekly |
| 1.5 - 2.0 | Low Risk | Info | Monitor daily |
| 1.2 - 1.5 | Medium Risk | Warning | Consider adding collateral |
| 1.05 - 1.2 | High Risk | Urgent | Add collateral or repay debt immediately |
| 1.0 - 1.05 | Critical | Emergency | Liquidation imminent — act NOW |
| < 1.0 | Liquidated | Alert | Position being/has been liquidated |

### Price Drop Calculator

```
How far can collateral price drop before liquidation?

  max_price_drop_pct = (1 - 1 / health_factor) * 100

  Example: Health Factor = 1.5
  Max drop = (1 - 1/1.5) * 100 = 33.3%
  Collateral price can drop 33.3% before liquidation.

  Example: Health Factor = 1.2
  Max drop = (1 - 1/1.2) * 100 = 16.7%
```

## Yield Opportunity Discovery

### Discovery Sources

| Source | Data Points | Coverage |
|--------|------------|---------|
| DeFiLlama Yields | APY, TVL, project, chain | 1000+ pools |
| Protocol APIs | Real-time APY, user positions | Per-protocol |
| On-chain data | Current pool stats, reserve ratios | All DeFi |

### DeFiLlama Yield API

```
GET https://yields.llama.fi/pools

Response per pool:
  pool: unique identifier
  chain: blockchain name
  project: protocol name
  symbol: pool token symbols
  tvlUsd: total value locked
  apy: current APY (%)
  apyBase: base APY from fees
  apyReward: reward APY from incentives
  stablecoin: boolean
  ilRisk: "yes"/"no"
  exposure: "single"/"multi"
  predictions: { predictedClass, binnedConfidence }
```

### Opportunity Ranking

```
function rankOpportunities(pools, risk_tolerance):
    for each pool:
        risk_score = assessPoolRisk(pool)  # 0-100
        reward_score = pool.apy

        # Risk-adjusted yield
        if risk_tolerance == "conservative":
            adj_yield = pool.apy * (1 - risk_score/100) * 1.5
        elif risk_tolerance == "moderate":
            adj_yield = pool.apy * (1 - risk_score/200)
        elif risk_tolerance == "aggressive":
            adj_yield = pool.apy  # Raw APY, minimal risk discount

        pool.ranking_score = adj_yield

    return sorted(pools, by: ranking_score, descending)
```

## Risk Assessment

### Per-Position Risk Factors

| Factor | Weight | Score Criteria |
|--------|--------|---------------|
| Smart Contract Risk | 30% | Audit status, TVL, time deployed, incident history |
| IL Risk | 20% | Volatile pair = high, stable pair = low, single-sided = none |
| Liquidation Risk | 20% | Health factor proximity to 1.0 |
| Protocol Risk | 15% | TVL trend, governance, insurance |
| Reward Token Risk | 15% | Sustainability of emissions, reward token price trend |

### Reward Sustainability Assessment

```
Sustainable Yield:
  Base APY (from trading fees / interest) is sustainable long-term
  Reward APY (from token emissions) is usually temporary

Check reward sustainability:
  reward_emission_rate = tokens_per_day * token_price
  protocol_revenue = daily_fees_earned

  If reward_emission > protocol_revenue * 5:
    -> Unsustainable (emissions far exceed revenue)
    -> APY will likely decrease significantly
    -> Weight base APY more heavily in projections
```

## Portfolio Optimization

### Rebalancing Recommendations

```
function optimizeYieldPortfolio(positions, target_risk):
    current_allocation = calculateAllocation(positions)
    current_risk = calculatePortfolioRisk(positions)
    current_yield = calculateWeightedAPY(positions)

    recommendations = []

    # Check for overconcentration
    for each position:
        if position.allocation > 30%:
            recommendations.push("REDUCE: " + position.protocol +
                " allocation from " + position.allocation + "% to < 30%")

    # Check for underperforming positions
    for each position:
        if position.apy < median_apy * 0.5 AND position.risk_score > median_risk:
            recommendations.push("EXIT: " + position.protocol +
                " — below average yield with above average risk")

    # Check for better opportunities
    opportunities = discoverOpportunities(target_risk)
    for each opp in top_3_opportunities:
        if opp.adj_yield > current_yield * 1.2:
            recommendations.push("CONSIDER: " + opp.protocol +
                " offering " + opp.apy + "% APY")

    # Check health factors
    for each lending_position:
        if lending_position.health_factor < 1.5:
            recommendations.push("URGENT: Improve health factor on " +
                lending_position.protocol)

    return recommendations
```

## Alert Configuration

| Alert Type | Trigger | Default Threshold |
|-----------|---------|-------------------|
| Health Factor Low | HF drops below threshold | < 1.3 |
| Health Factor Critical | HF approaching liquidation | < 1.1 |
| Yield Drop | APY drops significantly | -50% from entry APY |
| IL Threshold | IL exceeds acceptable level | -10% |
| Reward Claim Available | Unclaimed rewards exceed threshold | > $50 |
| TVL Drop | Protocol TVL declining | -25% in 7 days |
| Position Expiry | Fixed-term position nearing end | 7 days before expiry |

## Protocol Details

See `references/protocols.md` for detailed information on supported protocols including Aave, Compound, Uniswap, Curve, Convex, Yearn, GMX, Lido, Raydium, and Marinade.

See `references/il-calculator.md` for comprehensive impermanent loss formulas and scenarios.

See `references/position-types.md` for detailed risk/return profiles of each position type.