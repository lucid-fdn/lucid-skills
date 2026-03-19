# Position Types Reference

Detailed risk/return profiles, entry/exit procedures, and monitoring requirements for each DeFi position type.

## Lending (Supply)

### Description
Deposit tokens into a lending protocol to earn interest from borrowers.

### Entry Procedure
```
1. Choose protocol (Aave, Compound, Solend, etc.)
2. Approve token spending for the lending contract
3. Call supply/deposit function with token address and amount
4. Receive aToken (Aave) or cToken (Compound) as receipt
5. Record: entry_date, amount, protocol, chain, entry_APY
```

### Risk/Return Profile

| Factor | Assessment |
|--------|-----------|
| Expected APY | 1-10% (stablecoins higher in high-demand markets) |
| IL Risk | None |
| Liquidation Risk | None (supply only) |
| Smart Contract Risk | Low (blue-chip protocols) |
| Lock-up | None (withdraw anytime) |
| Capital Efficiency | Low (full capital deployed, modest returns) |

### Monitoring
- Check APY weekly (can fluctuate with utilization)
- Monitor protocol TVL and health
- Compare with alternative protocols for better rates
- No urgent monitoring needed (lowest risk position type)

### Exit Procedure
```
1. Call withdraw function with amount
2. Receive underlying tokens back
3. Claim any unclaimed rewards
4. Record: exit_date, amount received, rewards claimed
```

## Borrowing

### Description
Deposit collateral and borrow assets against it. Used for leverage, short selling, or accessing liquidity without selling.

### Entry Procedure
```
1. Supply collateral to lending protocol
2. Enable collateral (if not automatic)
3. Calculate safe borrow amount:
   Safe Borrow = Collateral Value * LTV * Safety Margin
   Safety Margin = 0.7 (borrow only 70% of max to avoid liquidation)
4. Call borrow function with desired amount
5. Record: collateral_amount, borrow_amount, health_factor, entry_date
```

### Risk/Return Profile

| Factor | Assessment |
|--------|-----------|
| Expected Return | Depends on what you do with borrowed funds |
| IL Risk | None directly |
| Liquidation Risk | HIGH — primary risk factor |
| Smart Contract Risk | Low-Medium |
| Lock-up | None (repay anytime) |
| Capital Efficiency | High (leverage enables more capital deployment) |

### Health Factor Management
```
Target Health Factor: > 2.0 (conservative)
Minimum Comfortable: > 1.5
Action Required: < 1.3
Emergency: < 1.1

To improve health factor:
  Option A: Add more collateral (supply additional assets)
  Option B: Repay part of the debt (reduce borrow)
  Option C: Swap collateral to less volatile asset (reduce price risk)
```

### Monitoring
- **Daily**: Check health factor
- **Hourly** (in volatile markets): Monitor collateral price
- Set alerts at HF = 1.5, 1.3, 1.1

## Liquidity Provision (LP)

### Description
Provide token pairs to a DEX pool. Earn trading fees proportional to share of pool.

### Entry Procedure
```
1. Acquire equal USD value of both tokens in the pair
2. Approve both tokens for the DEX router contract
3. For standard AMM: Call addLiquidity with both token amounts
4. For concentrated (V3): Choose price range, then addLiquidity
5. Receive LP tokens (V2) or NFT position (V3)
6. Record: token_amounts, prices_at_entry, pool_address, range (if V3)
```

### Risk/Return Profile

| Factor | Assessment |
|--------|-----------|
| Expected APY | 5-100%+ (varies enormously by pair and pool) |
| IL Risk | HIGH for volatile pairs, LOW for stable pairs |
| Liquidation Risk | None |
| Smart Contract Risk | Low (established DEXs) |
| Lock-up | None (remove liquidity anytime) |
| Capital Efficiency | Medium (V3 concentrated is higher) |

### Pool Selection Guide

| Pool Type | IL Risk | Fee Income | Best For |
|-----------|---------|-----------|---------|
| Stablecoin/Stablecoin | Minimal | Low (0.01-0.05%) | Safe, predictable yield |
| ETH/Stablecoin | Moderate | Medium (0.30%) | Balanced risk/return |
| Blue-chip/Blue-chip | Low-Moderate | Medium | Correlated assets |
| Volatile/Stablecoin | High | High (0.30-1.00%) | High risk, high potential |
| Meme/Stablecoin | Very High | Very High | Speculative, likely to lose money |

### Monitoring
- **Daily**: Check IL percentage, compare to fee income
- **Weekly**: Assess if LP is net profitable vs holding
- **On significant price move**: Re-evaluate position
- For concentrated positions: check if price is still in range

## Staking

### Description
Lock tokens in a staking contract to earn rewards, often for network security (PoS) or protocol governance.

### Types of Staking

| Type | Example | Lock Period | APY Range |
|------|---------|------------|-----------|
| Network Staking | ETH staking, SOL staking | Variable | 3-7% |
| Liquid Staking | Lido (stETH), Marinade (mSOL) | None (liquid) | 3-7% |
| Protocol Staking | veCRV, xSUSHI | Lock periods | 5-20% |
| Validator Staking | Running a validator node | Per network rules | 5-10% + MEV |

### Risk/Return Profile

| Factor | Assessment |
|--------|-----------|
| Expected APY | 3-20% (depends on protocol and lock period) |
| IL Risk | None |
| Liquidation Risk | None |
| Smart Contract Risk | Low (for blue-chip protocols) |
| Lock-up | Varies (liquid staking = none; veCRV = up to 4 years) |
| Slashing Risk | Low but exists for validators |

### Monitoring
- **Weekly**: Check reward accumulation
- **Monthly**: Compare APY to alternatives
- For liquid staking: monitor peg of derivative token (stETH, mSOL)

## Yield Farming

### Description
Provide liquidity AND stake LP tokens in a farming contract for additional reward tokens.

### Entry Procedure
```
1. Provide liquidity to DEX pool (get LP tokens)
2. Approve LP tokens for farming contract
3. Stake LP tokens in farming contract
4. Start earning: trading fees + farming rewards
5. Record: LP amount, farming contract, reward token, entry_APY
```

### Risk/Return Profile

| Factor | Assessment |
|--------|-----------|
| Expected APY | 10-200%+ (inflated by reward emissions) |
| IL Risk | Same as LP position |
| Reward Token Risk | HIGH — reward tokens often decline in price |
| Smart Contract Risk | Medium (additional contract layer) |
| Lock-up | Usually none (but may forfeit bonus for early exit) |
| Sustainability | Often unsustainable — APY declines as more capital enters |

### APY Decomposition
```
Total Farming APY = Base Fee APY + Reward APY

Important: Assess each separately.
  Base Fee APY = sustainable (from real trading activity)
  Reward APY = likely temporary (from token emissions)

  Estimate real return:
    Sustainable APY ~ Base Fee APY + (Reward APY * reward_sustainability_factor)
    reward_sustainability_factor:
      Established protocol, low emissions: 0.7-0.9
      New protocol, high emissions: 0.1-0.3
      Very high APY (> 100%): 0.05-0.1
```

### Monitoring
- **Daily**: Claim rewards and assess reward token price trend
- **Weekly**: Check if APY has declined significantly
- Consider selling reward tokens regularly to lock in value

## Vaults (Auto-Compounding)

### Description
Deposit tokens into an auto-managed strategy vault. Protocol executes complex yield strategies on your behalf.

### Risk/Return Profile

| Factor | Assessment |
|--------|-----------|
| Expected APY | 5-30% (after fees) |
| IL Risk | Depends on underlying strategy |
| Liquidation Risk | Depends on strategy (some involve borrowing) |
| Smart Contract Risk | Medium-High (complex multi-protocol strategies) |
| Lock-up | Usually none |
| Management Fees | 2% annual + 20% of profits (typical) |

### Vault Selection Criteria
```
Prefer vaults with:
  - Clear strategy description
  - Audited strategy contracts
  - TVL > $10M (battle-tested)
  - Consistent APY history (not just spike)
  - Protocol with strong reputation
  - Low withdrawal fees
```

## Perpetual Positions

### Description
Open leveraged long or short positions on perpetual futures DEXs (GMX, dYdX, Drift).

### Risk/Return Profile

| Factor | Assessment |
|--------|-----------|
| Expected Return | Variable (depends on trade direction and leverage) |
| IL Risk | None |
| Liquidation Risk | VERY HIGH (leveraged positions) |
| Funding Rate | Can be positive or negative |
| Smart Contract Risk | Medium |
| Lock-up | None |

### Key Metrics
```
Leverage: 1x to 50x (higher leverage = higher liquidation risk)
Liquidation Price: Entry Price +/- (Entry Price / Leverage) adjusted for fees
Funding Rate: Paid every 8 hours (long pays short when positive, vice versa)
```

## Position Type Comparison Matrix

| Type | Complexity | Risk | Return | Capital Lock | Monitoring |
|------|-----------|------|--------|-------------|-----------|
| Lending | Low | Low | Low (1-10%) | None | Weekly |
| Borrowing | Medium | High | Variable | None | Daily |
| LP (Stable) | Low | Low | Low-Med (2-15%) | None | Weekly |
| LP (Volatile) | Medium | Medium-High | Med-High (5-50%) | None | Daily |
| Staking | Low | Low | Low-Med (3-10%) | Variable | Weekly |
| Farming | Medium | Medium-High | High (10-200%) | None | Daily |
| Vault | Low | Medium | Med (5-30%) | None | Weekly |
| Perps | High | Very High | Variable | None | Continuous |
| Options | High | High | Variable | Expiry-based | Daily |