# Bridge Risk Assessment Reference

Security scoring methodology, hack history analysis, audit status, and risk mitigation strategies for cross-chain bridges.

## Bridge Security Score (0-100)

### Scoring Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Architecture Security | 30% | Validation mechanism, trust assumptions |
| Track Record | 25% | Exploit history, time in production |
| Audit Status | 20% | Number and quality of security audits |
| TVL & Liquidity | 10% | Total value locked (proxy for battle-testing) |
| Decentralization | 10% | Validator count, diversity, governance |
| Bug Bounty | 5% | Active bounty program and size |

### Architecture Security (30 points max)

```
Validation Mechanism:
  Optimistic verification (with economic guarantees): 25 points
  Multi-sig guardian (13/19+):                       22 points
  Oracle + relayer (independent parties):            20 points
  Validator network (< 20 validators):               15 points
  Simple multi-sig (< 5 signers):                    5 points
  Single validator/relayer:                           0 points

Trust Minimization Bonus:
  Uses fraud proofs or validity proofs:              +5 points
  Economic slashing for misbehavior:                 +3 points
  Permissionless relayer/validator set:              +2 points

Cap at 30.
```

### Track Record (25 points max)

```
Time in Production:
  > 3 years without major exploit:    15 points
  > 2 years without major exploit:    12 points
  > 1 year without major exploit:     8 points
  > 6 months:                         4 points
  < 6 months:                         0 points

Exploit History:
  No exploits ever:                   +10 points
  Minor exploit (< $1M, recovered):   +5 points
  Medium exploit ($1M-$50M):          -5 points
  Major exploit (> $50M):             -15 points
  Multiple exploits:                  Additional -10 per incident

Cap at 25, minimum 0.
```

### Audit Status (20 points max)

```
Number and Quality of Audits:
  3+ audits by top-tier firms:              20 points
  2 audits by reputable firms:              15 points
  1 audit by reputable firm:                10 points
  Community audit / contest only:           5 points
  No audit:                                 0 points

Top-tier audit firms:
  Trail of Bits, OpenZeppelin, Consensys Diligence,
  Quantstamp, Certora, Halborn, Spearbit

Recency bonus:
  Most recent audit < 6 months ago:         +3 points
  Most recent audit < 1 year ago:           +1 point
  Most recent audit > 1 year ago:           -3 points
```

### TVL & Liquidity (10 points max)

```
Total Value Locked:
  > $1B:    10 points
  > $500M:  8 points
  > $100M:  6 points
  > $10M:   4 points
  > $1M:    2 points
  < $1M:    0 points

TVL stability bonus:
  Stable or growing (30d):  +0 (no deduction)
  Declining > 20% (30d):    -2 points
  Declining > 50% (30d):    -5 points
```

### Decentralization (10 points max)

```
Validator/Guardian Set:
  > 100 independent validators:     10 points
  > 20 independent validators:      8 points
  > 10 validators:                  6 points
  > 5 validators:                   4 points
  1-5 validators:                   2 points
  Single entity control:            0 points

Geographic/organizational diversity bonus:
  Validators in 10+ countries:      +2 points
  Validators from 10+ orgs:         +2 points

Cap at 10.
```

### Bug Bounty (5 points max)

```
Active Bug Bounty:
  > $10M max payout (Immunefi):     5 points
  > $1M max payout:                 4 points
  > $100K max payout:               3 points
  > $10K max payout:                1 point
  No bug bounty:                    0 points
```

## Bridge Security Scores (Current Assessment)

| Bridge | Architecture | Track Record | Audits | TVL | Decentralization | Bug Bounty | Total |
|--------|-------------|-------------|--------|-----|-----------------|-----------|-------|
| Wormhole | 22/30 | 10/25 | 18/20 | 8/10 | 8/10 | 5/5 | **71/100** |
| Stargate | 20/30 | 22/25 | 18/20 | 6/10 | 6/10 | 4/5 | **76/100** |
| Across | 25/30 | 22/25 | 15/20 | 6/10 | 6/10 | 4/5 | **78/100** |
| Hop | 18/30 | 22/25 | 12/20 | 4/10 | 4/10 | 3/5 | **63/100** |
| Synapse | 15/30 | 18/25 | 12/20 | 4/10 | 5/10 | 3/5 | **57/100** |

### Score Interpretation

| Score Range | Risk Level | Recommendation |
|------------|-----------|---------------|
| 80-100 | Low Risk | Safe for large transfers |
| 65-79 | Medium-Low Risk | Safe for standard transfers |
| 50-64 | Medium Risk | Use with caution; consider splitting large amounts |
| 35-49 | Medium-High Risk | Small amounts only; have alternatives ready |
| 0-34 | High Risk | Avoid; use alternative bridges |

## Historical Bridge Exploits

### Major Exploits

| Date | Bridge | Amount Lost | Attack Vector | Recovery |
|------|--------|------------|--------------|----------|
| Feb 2022 | Wormhole | $326M | Signature verification bypass on Solana | Jump Crypto covered losses |
| Mar 2022 | Ronin (Axie) | $625M | Compromised 5/9 validator keys | Partial recovery over time |
| Jun 2022 | Harmony Horizon | $100M | Compromised 2/5 multi-sig keys | Not recovered |
| Aug 2022 | Nomad | $190M | Logic error allowing any message replay | ~$36M recovered |
| Nov 2022 | Synapse (related) | $8M | Price oracle manipulation | Recovered |
| Jan 2024 | Orbit Chain | $81M | Compromised multi-sig signers | Not recovered |

### Attack Vector Analysis

| Attack Type | Frequency | Prevention |
|-------------|----------|-----------|
| Validator/key compromise | Most common | Larger validator set, hardware security, rotation |
| Smart contract vulnerability | Common | Multiple audits, formal verification, bug bounty |
| Oracle manipulation | Occasional | TWAP, multiple oracle sources, circuit breakers |
| Replay attacks | Rare | Nonce tracking, chain-specific message formatting |
| Social engineering | Rare | Operational security, key management procedures |

### Risk Patterns to Watch

```
Red Flags for Bridge Risk:

1. Small validator set (< 5):
   Easier to compromise majority of validators
   Single point of failure

2. Recent launch (< 6 months):
   Insufficient battle-testing
   Unknown edge cases

3. Rapid TVL growth without matching security growth:
   Attractive target for attackers
   May outpace security measures

4. Governance centralization:
   Single team controls upgrades
   No timelock on critical changes

5. No bug bounty:
   No incentive for white-hat disclosure
   Vulnerabilities may be exploited rather than reported

6. Copied/forked code without re-audit:
   Fork may introduce new bugs
   Original audit may not cover modifications
```

## Risk Mitigation Strategies

### For Users

| Strategy | Description | When to Apply |
|----------|-------------|--------------|
| Split transfers | Divide large amounts across multiple bridges | Transfers > $100K |
| Use native bridges | L2 native bridges for L2<->L1 (slower but safest) | When time is not critical |
| Verify on both chains | Confirm receipt on destination before sending more | First time using a bridge |
| Limit approvals | Approve exact amount, not unlimited | Always |
| Monitor bridge health | Check TVL trend, exploit news before bridging | Before each bridge use |
| Diversify bridge usage | Don't rely on a single bridge for all transfers | Portfolio management |

### Transfer Size Guidelines

| Amount | Recommended Approach |
|--------|---------------------|
| < $1,000 | Use fastest/cheapest bridge; single transaction |
| $1,000 - $10,000 | Use top-rated bridge; single transaction |
| $10,000 - $100,000 | Split between 2 bridges; verify first small transfer |
| $100,000 - $1M | Split between 3+ bridges; use native bridge for portion |
| > $1M | Contact bridge teams directly; consider OTC; use native bridges |

### Emergency Procedures

```
If bridge transaction appears stuck:
  1. Check bridge explorer for transaction status
  2. Wait at least 2x the expected completion time
  3. Check bridge's official status page / Discord for incidents
  4. If stuck > 24 hours: contact bridge support with tx hash
  5. DO NOT attempt a second bridge of the same funds

If bridge exploit is reported:
  1. Do NOT initiate new transactions on the exploited bridge
  2. If you have pending transactions, they may be at risk
  3. Check if bridge has paused operations (good sign — damage control)
  4. Monitor official channels for updates and recovery plans
  5. Review your approvals and revoke if possible
```

## Annual Bridge Security Review Checklist

```
For each bridge you regularly use:
  [ ] Check for new audits published this year
  [ ] Review any security incidents since last check
  [ ] Verify validator set has not shrunk
  [ ] Confirm bug bounty is still active
  [ ] Check TVL trend (stable or growing = healthy)
  [ ] Review governance changes
  [ ] Verify insurance/recovery fund status
  [ ] Test with small amount before resuming large transfers
```