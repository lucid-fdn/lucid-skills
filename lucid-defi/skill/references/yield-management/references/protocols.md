# Protocol Details Reference

Supported DeFi protocols with APY sources, risk profiles, and integration details.

## Protocol Overview

| Protocol | Type | Chains | TVL Range | Risk Profile |
|----------|------|--------|-----------|-------------|
| Aave V3 | Lending | Ethereum, Arbitrum, Optimism, Polygon, Base, Avalanche | $10B+ | Low |
| Compound V3 | Lending | Ethereum, Arbitrum, Base, Polygon | $3B+ | Low |
| Uniswap V3 | AMM/LP | Ethereum, Arbitrum, Optimism, Base, Polygon, BSC | $5B+ | Low-Medium |
| Curve Finance | Stable AMM | Ethereum, Arbitrum, Optimism, Polygon, Avalanche | $2B+ | Low |
| Convex Finance | Yield Boost | Ethereum | $2B+ | Low-Medium |
| Yearn Finance | Vaults | Ethereum, Arbitrum, Optimism | $500M+ | Medium |
| GMX | Perp DEX | Arbitrum, Avalanche | $500M+ | Medium-High |
| Lido | Liquid Staking | Ethereum, Solana, Polygon | $15B+ | Low |
| Raydium | AMM/LP | Solana | $500M+ | Medium |
| Marinade Finance | Liquid Staking | Solana | $1B+ | Low |

## Aave V3

### Position Types
- **Supply (Lending)**: Deposit tokens, earn interest from borrowers
- **Borrow**: Borrow against deposited collateral

### APY Sources
```
Supply APY:
  Base: Variable interest from borrowers (supply/demand based)
  Reward: AAVE token incentives (varies by market)
  Total Supply APY = Base Supply APY + Reward APY

Borrow APY:
  Base: Variable interest rate (increases with utilization)
  Reward: May have negative reward APY (subsidized borrowing)
  Total Borrow Cost = Base Borrow APY - Reward APY
```

### Key Parameters

| Parameter | Typical Value | Description |
|-----------|-------------|-------------|
| LTV (Loan-to-Value) | 75-85% | Max borrow as % of collateral |
| Liquidation Threshold | 80-90% | Health factor triggers liquidation |
| Liquidation Penalty | 5-10% | Cost when liquidated |
| Reserve Factor | 10-20% | Protocol fee on interest |

### Risk Profile
- **Audit**: Multiple audits by Trail of Bits, Certora, SigmaPrime
- **TVL**: $10B+ (highly battle-tested)
- **Incident History**: Minor incidents, no major fund loss in V3
- **Governance**: DAO with timelock
- **Insurance**: Covered by Nexus Mutual, InsurAce
- **Risk Score**: 15/100 (LOW)

## Compound V3 (Comet)

### Position Types
- **Supply**: Earn interest on supplied base asset (USDC)
- **Collateral**: Deposit collateral assets (ETH, WBTC, etc.)
- **Borrow**: Borrow base asset against collateral

### APY Sources
```
Supply APY: Base interest + COMP rewards
Borrow APY: Base interest - COMP rewards
Liquidation: Bot-driven; ~5% penalty
```

### Key Difference from Aave
Single borrowable asset per market (e.g., USDC). Collateral assets do NOT earn interest. Simpler but less flexible.

### Risk Profile
- **Risk Score**: 15/100 (LOW)
- Multiple audits, $3B+ TVL, DAO governance

## Uniswap V3

### Position Types
- **LP (Concentrated)**: Provide liquidity within a price range
- **Full Range LP**: Provide liquidity across all prices (like V2)

### APY Sources
```
Fee APY = (24h_fees / position_value) * 365 * 100

Concentrated LP amplifies fees but also IL:
  Fee APY (concentrated) ~ Fee APY (full range) * Concentration Factor
  IL (concentrated) ~ IL (full range) * Concentration Factor
```

### Fee Tiers

| Fee Tier | Use Case | Typical Pairs |
|----------|----------|--------------|
| 0.01% | Stablecoin pairs | USDC/USDT |
| 0.05% | Correlated pairs | ETH/stETH |
| 0.30% | Standard pairs | ETH/USDC |
| 1.00% | Exotic/volatile pairs | Meme tokens |

### Risk Profile
- **Risk Score**: 25/100 (LOW-MEDIUM)
- IL risk for volatile pairs, concentrated positions amplify risk
- No protocol token rewards (purely fee-based yield)

## Curve Finance

### Position Types
- **StableSwap LP**: Provide liquidity to stablecoin pools
- **Crypto Pools**: V2-style pools for volatile pairs
- **Staking**: Stake CRV for veCRV governance + fee sharing

### APY Sources
```
Base APY: Trading fees (typically 0.01-0.04% per swap)
CRV Rewards: Protocol incentive emissions
Boost: veCRV holders get up to 2.5x boosted CRV rewards
External Rewards: Some pools have additional incentives (e.g., Frax, Lido)

Total APY = Base Fee APY + (CRV Reward APY * Boost) + External Rewards
```

### Risk Profile
- **Risk Score**: 20/100 (LOW)
- Stablecoin pools have minimal IL
- Crypto pools have standard IL risk
- CRV emission sustainability is a long-term concern

## Convex Finance

### Position Types
- **Staking LP Tokens**: Stake Curve LP tokens on Convex for boosted CRV + CVX

### APY Sources
```
Convex automatically:
  1. Stakes Curve LP tokens
  2. Claims CRV rewards at max boost (2.5x)
  3. Adds CVX rewards on top
  4. Auto-compounds (optional)

Total APY = Curve Base APY + Boosted CRV APY + CVX APY
```

### Risk Profile
- **Risk Score**: 25/100 (LOW-MEDIUM)
- Inherits Curve's risk + Convex smart contract risk
- CVX token price affects total APY

## Yearn Finance

### Position Types
- **Vaults**: Auto-managed strategy vaults

### APY Sources
```
Yearn vaults execute complex strategies:
  1. Deposit to lending protocol
  2. Borrow stablecoins
  3. Deposit borrowed stables into yield farms
  4. Auto-harvest and compound
  5. Rebalance to maintain safety margins

APY = Net yield after strategy execution, fees, and management
Fees: 2% management fee + 20% performance fee
```

### Risk Profile
- **Risk Score**: 35/100 (MEDIUM)
- Complex strategies increase smart contract risk surface
- Multi-protocol dependencies
- Strong audit history but more attack vectors

## GMX

### Position Types
- **GLP/GM Pools**: Provide liquidity for perpetual trading
- **Perp Trading**: Trade perpetual futures with leverage
- **Staking**: Stake GMX for protocol fees

### APY Sources
```
GLP/GM Pool:
  Source: Trading fees from perpetual traders + funding payments
  APY varies with trading volume (higher volume = higher APY)
  Risk: Acts as counterparty to traders (if traders profit, LPs lose)

GMX Staking:
  Source: 30% of protocol fees in ETH/AVAX + esGMX rewards
```

### Risk Profile
- **Risk Score**: 45/100 (MEDIUM-HIGH)
- LP acts as counterparty to traders (can lose if traders are profitable)
- Exposure to multiple tokens in GLP basket
- High APY but higher risk

## Lido

### Position Types
- **Liquid Staking**: Stake ETH, receive stETH (liquid staking token)

### APY Sources
```
Source: Ethereum consensus rewards + execution rewards (MEV/tips)
Current APY: ~3-4% (varies with network activity)
Fee: 10% of staking rewards (5% to node operators, 5% to DAO)

stETH can be used as collateral in Aave, Compound, etc. for additional yield.
```

### Risk Profile
- **Risk Score**: 15/100 (LOW)
- Largest liquid staking provider
- stETH peg risk (can depeg in extreme market conditions)
- Slashing risk (minimal with distributed validator set)

## Raydium (Solana)

### Position Types
- **Standard AMM LP**: Provide liquidity to token pairs
- **Concentrated Liquidity (CLMM)**: V3-style concentrated positions
- **AcceleRaytor**: Launchpad participation

### APY Sources
```
Standard AMM: Trading fees + RAY rewards
CLMM: Trading fees (concentrated, higher per $ of liquidity)
Farming: Additional rewards for staking LP tokens
```

### Risk Profile
- **Risk Score**: 35/100 (MEDIUM)
- IL risk for volatile Solana pairs
- Solana network reliability risk
- Lower TVL than EVM DeFi blue chips

## Marinade Finance (Solana)

### Position Types
- **Liquid Staking**: Stake SOL, receive mSOL
- **Native Staking**: Direct staking to validators via Marinade

### APY Sources
```
Source: Solana staking rewards (~6-7% APY)
Fee: ~6% commission on staking rewards (varies by strategy)
mSOL can be used in Solana DeFi for additional yield
```

### Risk Profile
- **Risk Score**: 20/100 (LOW)
- Largest Solana liquid staking protocol
- mSOL peg risk (minimal in normal conditions)
- Solana network risk

## Protocol Comparison Table

| Protocol | Typical APY Range | IL Risk | Liquidation Risk | Smart Contract Risk | Overall Risk |
|----------|------------------|---------|-----------------|-------------------|-------------|
| Aave V3 | 1-8% (supply) | None | Yes (borrow) | Low | LOW |
| Compound V3 | 1-6% (supply) | None | Yes (borrow) | Low | LOW |
| Uniswap V3 | 5-50%+ | Yes (high for volatile) | None | Low | LOW-MED |
| Curve | 2-15% | Low (stables) | None | Low | LOW |
| Convex | 5-20% | Low (inherits Curve) | None | Low-Med | LOW-MED |
| Yearn | 5-30% | Varies | Varies | Medium | MEDIUM |
| GMX | 10-40% | Counterparty risk | None | Medium | MED-HIGH |
| Lido | 3-4% | None | None (no borrow) | Low | LOW |
| Raydium | 5-100%+ | Yes | None | Medium | MEDIUM |
| Marinade | 6-7% | None | None | Low | LOW |