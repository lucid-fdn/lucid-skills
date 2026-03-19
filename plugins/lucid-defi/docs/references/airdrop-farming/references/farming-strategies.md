# Farming Strategies Reference

Optimization algorithms, ROI formulas, cost estimation, and strategy templates for airdrop farming.

## ROI Formulas

### Basic ROI

```
Farming Cost = Gas Fees + Opportunity Cost + Deposit Capital
  Gas Fees = sum of all transaction gas costs
  Opportunity Cost = Deposit Capital * (APY_alternative / 365) * days_locked
  Deposit Capital = minimum deposit required (returned after snapshot)

Estimated Airdrop Value = mid_estimate from value estimation method

Gross ROI = (Estimated Value - Farming Cost) / Farming Cost * 100
```

### Expected ROI (Risk-Adjusted)

```
Expected Value = Estimated Value * Probability_of_Airdrop * Probability_of_Eligibility

Probability_of_Airdrop:
  HIGH confidence   = 0.80
  MEDIUM confidence = 0.50
  LOW confidence    = 0.20

Probability_of_Eligibility:
  All criteria met       = 0.95  (small chance of sybil filter)
  Most criteria met      = 0.70
  Some criteria met      = 0.40
  Few criteria met       = 0.15

Expected ROI = (Expected Value - Farming Cost) / Farming Cost * 100
```

### Time-Adjusted ROI

```
Time Investment = hours spent farming (research + execution + monitoring)
Hourly Value = Expected Value / Time Investment

Compare to opportunity cost:
  If Hourly Value > $50/hour -> EXCELLENT time investment
  If Hourly Value $20-$50    -> GOOD time investment
  If Hourly Value $10-$20    -> MODERATE time investment
  If Hourly Value < $10      -> POOR time investment (consider skipping)
```

## Cost Estimation

### Gas Cost Estimation by Chain

| Chain | Avg Swap Gas | Avg Bridge Gas | Avg Deposit Gas | Avg Governance Gas |
|-------|-------------|---------------|-----------------|-------------------|
| Ethereum | $5-50 | $10-80 | $5-40 | $3-20 |
| Arbitrum | $0.10-0.50 | $0.50-2.00 | $0.10-0.50 | $0.05-0.20 |
| Optimism | $0.05-0.30 | $0.30-1.50 | $0.05-0.30 | $0.03-0.15 |
| Base | $0.02-0.15 | $0.20-1.00 | $0.02-0.15 | $0.01-0.10 |
| Polygon | $0.01-0.05 | $0.10-0.50 | $0.01-0.05 | $0.01-0.03 |
| Solana | $0.001-0.01 | $0.10-0.50 | $0.001-0.01 | $0.001-0.01 |
| BSC | $0.05-0.30 | $0.30-1.50 | $0.05-0.30 | $0.03-0.15 |
| zkSync | $0.05-0.30 | $0.50-3.00 | $0.05-0.30 | $0.03-0.15 |

### Total Farming Cost Template

```
Protocol: [Name]
Chain: [Primary Chain]

Gas Costs:
  Initial bridge to chain:       $X.XX
  5 swap transactions:           $X.XX * 5 = $XX.XX
  1 LP provision:                $X.XX
  1 LP removal:                  $X.XX
  1 deposit + 1 withdrawal:     $X.XX * 2 = $XX.XX
  1 governance vote:             $X.XX
  Bridge back:                   $X.XX
  ─────────────────────────────────────
  Total Gas:                     $XX.XX

Capital Required:
  Minimum LP position:           $100 (returned)
  Minimum lending deposit:       $500 (returned)
  ─────────────────────────────────────
  Capital Locked:                $600 (temporary)
  Opportunity Cost (30d @5% APY): $2.47

Total Farming Cost:              $XX.XX (gas) + $2.47 (opportunity) = $XX.XX
```

## Budget Optimization Algorithm

### Greedy Knapsack Approach

```
function optimizeFarming(budget, time_hours, protocols, risk_tolerance):
    # Filter by risk tolerance
    if risk_tolerance == "conservative":
        protocols = filter(p where p.confidence == "HIGH")
    elif risk_tolerance == "moderate":
        protocols = filter(p where p.confidence in ["HIGH", "MEDIUM"])
    # "aggressive" keeps all protocols

    # Calculate expected ROI for each
    for each protocol p:
        p.expected_roi = computeExpectedROI(p)
        p.time_cost = estimateTimeCost(p)
        p.budget_cost = estimateFarmingCost(p)
        p.efficiency = p.expected_roi / p.time_cost  # ROI per hour

    # Sort by efficiency (expected ROI per hour spent)
    protocols.sort(by: efficiency, descending)

    plan = []
    remaining_budget = budget
    remaining_time = time_hours

    for each protocol p in sorted list:
        if p.budget_cost <= remaining_budget AND p.time_cost <= remaining_time:
            plan.append(p)
            remaining_budget -= p.budget_cost
            remaining_time -= p.time_cost

    return plan
```

### Multi-Chain Strategy

When farming multiple protocols across chains, optimize bridge routing:

```
function optimizeBridgeRouting(plan):
    # Group protocols by chain
    chain_groups = groupBy(plan, chain)

    # Order chain visits to minimize bridge transactions
    # Use nearest-neighbor heuristic:
    route = []
    current_chain = chain with most protocols (start here)
    remaining = set of all chains

    while remaining is not empty:
        route.append(current_chain)
        remaining.remove(current_chain)
        # Bridge to chain with cheapest bridge from current
        current_chain = argmin(bridge_cost(current_chain, c) for c in remaining)

    return route

    # Execute all protocols on each chain before bridging to next
    # This minimizes total bridge fees
```

## Strategy Templates

### Budget: $50 (Micro Budget)

Focus on low-cost chains only.

```
Priority: High-confidence airdrops on L2s and Solana
Chains: Arbitrum, Base, Optimism, Solana (gas < $1 per tx)
Strategy:
  1. Bridge $50 to cheapest target chain
  2. Execute minimum criteria (5 swaps, 1 LP, 1 deposit)
  3. Move to next chain, repeat
  4. Aim for 2-3 protocols
Estimated total gas: $5-15
Expected time: 3-5 hours
```

### Budget: $500 (Standard Budget)

Balance across multiple protocols and chains.

```
Priority: All HIGH + selected MEDIUM confidence airdrops
Chains: Arbitrum, Base, Optimism, Solana, zkSync, Polygon
Strategy:
  1. Allocate $100-200 for deposits/LP (returned after snapshot)
  2. Allocate $50-100 for gas across all chains
  3. Exceed minimum criteria where possible (2x thresholds)
  4. Aim for 5-8 protocols
  5. Maintain positions for minimum duration requirements
Estimated total gas: $30-80
Expected time: 10-20 hours
```

### Budget: $5,000+ (Power User Budget)

Maximize coverage and exceed all thresholds.

```
Priority: All airdrops, maximize allocation tier
Chains: All supported chains including Ethereum mainnet
Strategy:
  1. Allocate significant capital to deposits ($1K-3K)
  2. Target top allocation tier on each protocol
  3. Farm 10-15+ protocols simultaneously
  4. Use multi-month strategy for time-based criteria
  5. Participate in governance on all protocols
  6. Consider running nodes for infrastructure projects
Estimated total gas: $200-500
Expected time: 30-50+ hours
```

## Task Sequencing

Optimal order for completing farming tasks on a single protocol:

```
Day 1:
  1. Bridge funds to target chain
  2. Execute first swap (establishes activity)
  3. Provide liquidity (starts LP duration timer)
  4. Deposit into lending (starts deposit duration timer)

Day 7:
  5. Execute 2-3 more swaps (different pairs)
  6. Vote on governance if available

Day 14:
  7. Execute remaining swaps
  8. Check if any new criteria have been announced

Day 30+ (if time-based criteria):
  9. Maintain positions
  10. Execute 1 transaction per month for "unique months" criteria

After Snapshot:
  11. Remove LP
  12. Withdraw deposits
  13. Bridge funds back (or to next farming target)
```

## Monitoring Checklist

| Check | Frequency | Action if Issue |
|-------|-----------|----------------|
| Snapshot date announced | Daily | Rush to complete remaining criteria |
| Criteria updated | Daily | Adjust farming plan |
| Protocol TVL dropping | Weekly | Reassess confidence level |
| Gas prices spike | Before tx | Wait for lower gas or switch to L2 |
| New competitor airdrop | Monthly | May reduce target protocol's incentive |
| Sybil list published | As announced | Check if wallet is flagged |