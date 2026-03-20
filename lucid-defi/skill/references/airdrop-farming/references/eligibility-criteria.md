# Eligibility Criteria Reference

Criteria templates, scoring weights, and confidence levels for known and anticipated airdrops.

## Standard Criteria Templates

### L2 / Rollup Airdrop Template

Typical criteria for Layer 2 rollup airdrops (e.g., Arbitrum, Optimism, zkSync pattern):

| Criterion | Typical Threshold | Weight | Verification Method |
|-----------|------------------|--------|-------------------|
| Bridge to L2 | >= 1 bridge tx | 15 | Check bridge contract deposits |
| Transaction count | >= 10 txs on L2 | 15 | Count txs on L2 chain |
| Unique months active | >= 3 months | 15 | Distinct months with activity |
| Volume on L2 | >= $1,000 | 15 | Sum of all tx values |
| DeFi interactions | >= 3 protocols used | 15 | Unique contract addresses interacted with |
| Bridge volume | >= $500 | 10 | Sum of bridge tx values |
| Unique days active | >= 10 days | 10 | Distinct days with activity |
| Held assets > 30 days | Yes | 5 | Check balance persistence |

### DEX Airdrop Template

Typical criteria for decentralized exchange airdrops (e.g., Uniswap, dYdX pattern):

| Criterion | Typical Threshold | Weight | Verification Method |
|-----------|------------------|--------|-------------------|
| Swap count | >= 5 swaps | 20 | Count swap txs on DEX router |
| Total volume | >= $1,000 | 20 | Sum swap USD values |
| Unique pairs | >= 3 pairs | 15 | Distinct token pairs traded |
| LP provision | Any amount | 15 | Check LP token holdings |
| Unique months | >= 2 months | 15 | Distinct months with swaps |
| LP duration | >= 30 days | 10 | Time LP tokens held |
| Governance vote | >= 1 vote | 5 | Governor contract interactions |

### Bridge Protocol Airdrop Template

Typical criteria for cross-chain bridge airdrops (e.g., LayerZero, Wormhole pattern):

| Criterion | Typical Threshold | Weight | Verification Method |
|-----------|------------------|--------|-------------------|
| Bridge txs | >= 5 bridges | 20 | Count bridge contract calls |
| Unique source chains | >= 3 chains | 20 | Distinct originating chains |
| Unique destination chains | >= 3 chains | 15 | Distinct destination chains |
| Total volume bridged | >= $1,000 | 15 | Sum of bridged USD values |
| Unique months | >= 3 months | 15 | Distinct months with bridges |
| Message passing | >= 1 message | 10 | Non-token message protocol usage |
| Total fees paid | >= $50 | 5 | Sum of bridge fees |

### Lending Protocol Airdrop Template

| Criterion | Typical Threshold | Weight | Verification Method |
|-----------|------------------|--------|-------------------|
| Deposit amount | >= $500 | 25 | Check deposit txs and balances |
| Deposit duration | >= 30 days | 20 | Time with active deposits |
| Borrow activity | Any borrow | 15 | Check borrow txs |
| Unique markets | >= 2 markets | 15 | Distinct tokens supplied/borrowed |
| Unique months | >= 2 months | 10 | Distinct months active |
| Repay on time | No liquidations | 10 | Check liquidation events |
| Governance | >= 1 vote | 5 | Governor contract interactions |

### Infrastructure / Staking Template

| Criterion | Typical Threshold | Weight | Verification Method |
|-----------|------------------|--------|-------------------|
| Staked amount | >= $100 | 25 | Check staking contract |
| Staking duration | >= 30 days | 25 | Time staked continuously |
| Delegation | Delegated to operator | 20 | Check delegation records |
| Testnet participation | Active on testnet | 15 | Testnet chain activity |
| Community contribution | Discord, forum posts | 10 | Cannot verify on-chain |
| Early adopter | Used before date X | 5 | First tx timestamp |

## Scoring Formula Detail

```
For each criterion C[i] with weight W[i]:

  progress[i] = min(actual_value[i] / required_value[i], 1.0)

  # Bonus for significantly exceeding threshold
  if actual_value[i] >= 2 * required_value[i]:
    progress[i] = 1.0  # Already capped, but mark as "exceeded"
    tier_bonus[i] = 0.05 * W[i]  # 5% bonus per exceeded criterion

  weighted_score[i] = W[i] * progress[i]

Total Score = sum(weighted_score[i]) + sum(tier_bonus[i])
Capped at 100.
```

## Confidence Levels

### Airdrop Probability Confidence

| Level | Probability | Criteria |
|-------|------------|---------|
| HIGH | 70-90% | Official announcement, token confirmed, criteria published |
| MEDIUM | 40-69% | Strong signals (VC funding, token-less protocol, competitor did airdrop), no official confirmation |
| LOW | 10-39% | Speculation only, early-stage protocol, no funding announcements |
| VERY LOW | < 10% | Already has token, or team has denied airdrop plans |

### Criteria Confidence

| Level | Meaning |
|-------|---------|
| CONFIRMED | Protocol published official criteria |
| INFERRED | Based on on-chain analysis of confirmed airdrop (retroactive) |
| ESTIMATED | Based on similar protocol patterns |
| SPECULATIVE | Community guesswork, no strong basis |

## Sybil Resistance Patterns

Common anti-sybil measures that may disqualify wallets:

| Pattern | Detection Method | Impact |
|---------|-----------------|--------|
| Cluster funding | All wallets funded from same source | Disqualification |
| Same-time transactions | Multiple wallets transacting within same block | High risk |
| Low balance dust wallets | Wallet only has gas + minimal tokens | Reduced allocation |
| Linear patterns | Same sequence of interactions across wallets | Disqualification |
| Known sybil lists | Address appears on Hop/Connext/etc. sybil lists | Disqualification |

### Sybil Risk Self-Assessment

```
For the user's wallet, check:
  [ ] Wallet funded from a unique, non-flagged source
  [ ] Activity pattern appears organic (varied timing, amounts)
  [ ] Balance includes meaningful held positions (not just gas)
  [ ] Not on any known sybil lists
  [ ] Unique IP/geographic indicators (cannot verify on-chain)

Risk Level:
  All checks pass     -> LOW sybil risk
  1-2 flags           -> MEDIUM risk (may face reduced allocation)
  3+ flags            -> HIGH risk (likely disqualified)
```

## Historical Airdrop Benchmarks

Reference data from past airdrops for estimation:

| Protocol | Category | FDV at Launch | Airdrop % | Recipients | Median Claim |
|----------|----------|--------------|-----------|------------|-------------|
| Uniswap | DEX | $3.4B | 15% | 250,000 | $1,400 |
| Optimism | L2 | $4.5B | 19% | 260,000 | $1,200 |
| Arbitrum | L2 | $7.8B | 11.5% | 625,000 | $1,500 |
| Aptos | L1 | $4.0B | 7% | 110,000 | $200 |
| Jito | Staking | $1.5B | 10% | 9,000 | $10,000 |
| Jupiter | DEX | $6.9B | 10% | 955,000 | $400 |
| Wormhole | Bridge | $6.0B | 6.6% | 400,000 | $700 |
| Starknet | L2 | $6.8B | 9% | 1,300,000 | $350 |
| LayerZero | Bridge | $3.5B | 8.5% | 1,280,000 | $150 |
| Eigenlayer | Infra | $8.0B | 5% | 200,000 | $1,500 |