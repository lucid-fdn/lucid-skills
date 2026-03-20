---
name: airdrop-farming
description: "Airdrop discovery, eligibility checking, farming optimization, value estimation, and claim tracking"
---

# Airdrop Farming

Discover upcoming airdrops, check wallet eligibility, optimize farming strategies within budget constraints, estimate airdrop values, and track claims through their lifecycle.

## Airdrop Analysis Procedure

When the user asks about airdrops, follow this procedure:

1. **Identify the request type**:

| Request Type | Action | Key Output |
|-------------|--------|------------|
| "Find airdrops to farm" | Discovery + Prioritization | Ranked list by estimated ROI |
| "Am I eligible for X airdrop" | Eligibility Check | Criteria met/unmet, completion % |
| "How much is X airdrop worth" | Value Estimation | Estimated token value range |
| "What should I farm with $X budget" | Budget Optimization | Optimized farming plan |
| "Track my airdrops" | Claim Tracking | Status of all claimed/pending drops |
| "When are snapshot dates" | Calendar View | Timeline of upcoming events |

2. **Gather relevant data** for the analysis type.

3. **Apply algorithms** from reference files for scoring, estimation, or optimization.

4. **Present results** with confidence levels and actionable next steps.

## Airdrop Lifecycle

Every airdrop progresses through these stages:

```
RUMORED -> ANNOUNCED -> FARMING -> SNAPSHOT -> CLAIMABLE -> CLAIMED/EXPIRED

Stages:
  RUMORED:    No official confirmation; community speculation based on VC funding,
              token-less protocol, competitor airdrops
  ANNOUNCED:  Protocol officially confirms airdrop; criteria may or may not be public
  FARMING:    Active period where interactions count toward eligibility
  SNAPSHOT:   Block/date at which eligibility is frozen; no further interactions count
  CLAIMABLE:  Tokens available to claim; claim window is open
  CLAIMED:    User has successfully claimed tokens
  EXPIRED:    Claim window has closed; unclaimed tokens returned to treasury
```

### Lifecycle Tracking Schema

| Field | Type | Description |
|-------|------|-------------|
| protocol_name | string | Protocol name |
| chain | string | Primary chain |
| category | string | DeFi, L2, Infrastructure, Gaming, Social, DAO |
| stage | string | Current lifecycle stage |
| announced_date | date | When officially announced (if applicable) |
| snapshot_date | date | When snapshot occurs/occurred |
| claim_start | date | When claiming opens |
| claim_deadline | date | When claiming expires |
| estimated_value_usd | range | Low-mid-high value estimate |
| farming_cost_usd | number | Estimated cost to qualify |
| confidence | string | High, Medium, Low |

## Eligibility Checking

Evaluate a wallet's qualification status against known or inferred airdrop criteria.

### Standard Criteria Types

| Criteria Type | Description | How to Check |
|--------------|-------------|-------------|
| Transaction Count | Minimum number of transactions on the protocol | Query wallet tx history, filter by protocol contracts |
| Volume | Minimum swap/trade volume in USD | Sum USD value of all qualifying transactions |
| TVL / Deposit | Minimum amount deposited or held in protocol | Check current and historical protocol positions |
| Time Active | Minimum time using the protocol | First tx date to last tx date on protocol |
| Unique Days | Minimum distinct days with activity | Count unique dates of protocol transactions |
| Unique Months | Minimum distinct months with activity | Count unique months of protocol transactions |
| Bridge Volume | Minimum bridged amount | Sum bridge transaction values |
| LP Provision | Provided liquidity to protocol pools | Check LP token holdings or add/remove liquidity txs |
| Governance | Voted in governance proposals | Check governance contract interactions |
| Testnet | Interacted with testnet version | Check testnet chain transactions |
| NFT Holder | Hold a specific NFT collection | Check NFT balances |
| Social | Connected social accounts, joined Discord | Cannot verify on-chain; user must self-report |

### Eligibility Scoring

```
For each criterion:
  met = true/false (has the wallet satisfied this criterion?)
  weight = importance weight (sum of all weights = 100)
  progress = current_value / required_value (capped at 1.0)

Eligibility Score = sum(weight * progress) for all criteria

Qualification Tiers:
  Score >= 90  -> HIGHLY LIKELY eligible (most criteria exceeded)
  Score 70-89  -> LIKELY eligible (core criteria met)
  Score 50-69  -> POSSIBLE (some criteria met, gaps remain)
  Score 30-49  -> UNLIKELY (significant gaps)
  Score < 30   -> NOT ELIGIBLE (major criteria unmet)
```

### Example Eligibility Check

```
Protocol: LayerZero
Criteria:
  [x] Bridge transactions >= 5     (user has 8)    weight: 25, progress: 1.0
  [x] Unique chains >= 3           (user has 5)    weight: 20, progress: 1.0
  [x] Total volume >= $1,000       (user has $4.2K) weight: 20, progress: 1.0
  [ ] Unique months >= 6           (user has 3)    weight: 20, progress: 0.5
  [x] Source chain diversity >= 2  (user has 3)    weight: 15, progress: 1.0

Score = 25*1.0 + 20*1.0 + 20*1.0 + 20*0.5 + 15*1.0 = 90
-> HIGHLY LIKELY eligible
```

See `references/eligibility-criteria.md` for criteria templates for known protocols.

## Value Estimation

Estimate the USD value of an upcoming airdrop using comparable project analysis.

### Comparable Project Method

```
Step 1: Find comparable projects that already airdropped
  - Same category (L2, DEX, Lending, Bridge, etc.)
  - Similar TVL at time of airdrop
  - Similar funding raised
  - Similar user count

Step 2: Gather airdrop metrics from comparables
  For each comparable:
    FDV_at_launch     = Fully Diluted Valuation at token launch
    airdrop_pct       = Percentage of supply allocated to airdrop
    total_recipients  = Number of eligible wallets
    median_claim_usd  = Median claim value in USD

Step 3: Estimate for target protocol
  Estimated FDV = based on funding raised * typical multiple for category
    Seed round: 10-20x
    Series A: 5-10x
    Series B: 3-5x

  Estimated Airdrop Pool = FDV * estimated_airdrop_pct (typically 5-15%)
  Estimated Per Wallet = Airdrop Pool / estimated_recipients

  Present as range:
    Low estimate:  Conservative FDV * low airdrop % / high recipient count
    Mid estimate:  Median comparable values
    High estimate: Optimistic FDV * high airdrop % / low recipient count
```

### Category Benchmarks

| Category | Typical Airdrop % | Typical FDV Multiple | Median Claim (USD) |
|----------|-------------------|---------------------|-------------------|
| L2 | 5-12% | 10-50x funding | $500 - $5,000 |
| DEX | 5-15% | 5-30x funding | $200 - $3,000 |
| Lending | 5-10% | 5-20x funding | $300 - $2,000 |
| Bridge | 5-10% | 5-15x funding | $200 - $1,500 |
| Infrastructure | 3-8% | 10-50x funding | $100 - $2,000 |
| Gaming | 5-15% | 3-15x funding | $50 - $500 |
| Social | 5-15% | 3-20x funding | $50 - $1,000 |

See `references/farming-strategies.md` for detailed ROI formulas.

## Farming Optimization

Given a budget, recommend the optimal set of protocols to farm.

### Budget-Constrained Optimization

```
Inputs:
  budget:          Total USD available for farming
  risk_tolerance:  conservative, moderate, aggressive
  time_available:  hours per week the user can dedicate

For each candidate protocol:
  estimated_cost    = gas fees + minimum deposit + transaction costs
  estimated_value   = mid_estimate from value estimation
  estimated_roi     = (estimated_value - estimated_cost) / estimated_cost * 100
  time_required     = estimated hours to complete all criteria
  confidence        = airdrop probability (high=0.8, medium=0.5, low=0.2)
  expected_value    = estimated_value * confidence
  expected_roi      = (expected_value - estimated_cost) / estimated_cost * 100

Optimization:
  Sort protocols by expected_roi descending
  Greedily allocate budget:
    For each protocol (highest expected_roi first):
      If estimated_cost <= remaining_budget AND time_required <= remaining_time:
        Add to farming plan
        remaining_budget -= estimated_cost
        remaining_time -= time_required

  Present plan as ordered list with:
    Protocol, Chain, Estimated Cost, Expected Value, Expected ROI, Confidence, Tasks
```

### Risk-Adjusted Recommendations

| Risk Tolerance | Confidence Filter | Min Expected ROI |
|---------------|-------------------|-----------------|
| Conservative | High only | > 200% |
| Moderate | High + Medium | > 100% |
| Aggressive | All | > 50% |

## Interaction Tracking

Track which farming tasks have been completed for each protocol.

### Interaction Types

| Type | Description | Verification |
|------|-------------|-------------|
| Swap | Token swap on protocol's DEX | Tx to router contract |
| Bridge | Cross-chain token transfer | Bridge contract interaction |
| Deposit | Deposit into lending/vault | Deposit function call |
| Withdraw | Withdraw from lending/vault | Withdraw function call |
| LP Add | Add liquidity to pool | addLiquidity function call |
| LP Remove | Remove liquidity from pool | removeLiquidity function call |
| Stake | Stake tokens in protocol | Stake function call |
| Unstake | Unstake tokens from protocol | Unstake function call |
| Vote | Governance vote | Governor contract interaction |
| Claim | Claim rewards | Claim function call |
| Mint | Mint NFT or token | Mint function call |

### Progress Tracking Template

```
Protocol: [Name]
Chain: [Chain]
Stage: FARMING
Started: [Date]
Budget Spent: $[X] / $[Budget]

Tasks:
  [x] First swap on protocol         ($2.50 gas)    [tx: 0x...]
  [x] Bridge to/from protocol        ($5.00 gas)    [tx: 0x...]
  [ ] Provide liquidity (min $100)   (~$3.00 gas)   [pending]
  [ ] Hold LP for 30 days            (no cost)      [waiting]
  [ ] 3 unique months of activity    (month 1 of 3) [in progress]
  [ ] Governance vote                (~$1.00 gas)   [waiting for proposal]

Completion: 33% (2/6 tasks)
Est. Remaining Cost: $4.00 gas + $100 LP deposit
```

## Calendar View

Present upcoming airdrop events in chronological order.

### Calendar Format

```
=== UPCOMING EVENTS ===

Feb 2026:
  [15] Protocol A — Snapshot date (FARMING ends)
  [28] Protocol B — Claim deadline (EXPIRES)

Mar 2026:
  [01] Protocol C — Claim opens (CLAIMABLE)
  [15] Protocol D — Estimated snapshot (RUMORED)

Apr 2026:
  [TBD] Protocol E — Expected launch (ANNOUNCED)
```

### Priority Flags

| Flag | Meaning | Action |
|------|---------|--------|
| URGENT | Snapshot/deadline within 7 days | Complete farming tasks NOW |
| SOON | Event within 30 days | Plan and begin execution |
| PLANNED | Event 30-90 days out | Monitor and prepare |
| WATCHING | Event > 90 days or TBD | Track for updates |