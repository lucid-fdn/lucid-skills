# lucid-defi

DeFi operations intelligence skills for AI agents. Covers yield farming, impermanent loss calculation, airdrop farming, and cross-chain bridging.

## Overview

`lucid-defi` is a skill package from the Lucid Foundation that provides AI agents with deep knowledge of DeFi operations. These skills were split out from `lucid-trade` because they focus on earning yield and managing DeFi positions rather than speculating on price.

**Version**: 4.0.0
**License**: MIT
**Author**: Lucid Foundation
**Platforms**: Claude Code, OpenClaw

## Skills

### yield-management

Track DeFi yield positions across protocols, calculate impermanent loss, monitor health factors for lending positions, discover yield opportunities, assess risk, and optimize portfolio allocation between yield sources.

**Capabilities**:
- Position tracking across Aave, Compound, Uniswap, Curve, Convex, Yearn, GMX, Lido, Raydium, and Marinade
- APY vs APR conversion and yield projection
- Impermanent loss calculation for standard AMMs, concentrated liquidity, stablecoin pairs, and weighted pools
- Health factor monitoring with liquidation risk alerts
- Yield opportunity discovery via DeFiLlama and protocol APIs
- Risk-adjusted opportunity ranking
- Portfolio optimization and rebalancing recommendations

**Reference Files**:
- `skills/yield-management/references/il-calculator.md` -- Comprehensive IL formulas, lookup tables, worked examples, and simulation tools
- `skills/yield-management/references/protocols.md` -- Detailed protocol profiles for 10 major DeFi protocols with APY sources and risk scores
- `skills/yield-management/references/position-types.md` -- Risk/return profiles, entry/exit procedures, and monitoring requirements for each position type

### airdrop-farming

Discover upcoming airdrops, check wallet eligibility, optimize farming strategies within budget constraints, estimate airdrop values, and track claims through their lifecycle.

**Capabilities**:
- Airdrop lifecycle tracking (RUMORED through CLAIMED/EXPIRED)
- Wallet eligibility scoring against known and inferred criteria
- Value estimation using comparable project analysis and category benchmarks
- Budget-constrained farming optimization with risk-adjusted ROI
- Interaction tracking and progress monitoring
- Calendar view with priority flags for upcoming events
- Sybil risk self-assessment

**Reference Files**:
- `skills/airdrop-farming/references/eligibility-criteria.md` -- Criteria templates for L2, DEX, Bridge, Lending, and Infrastructure airdrops with scoring formulas
- `skills/airdrop-farming/references/farming-strategies.md` -- ROI formulas, cost estimation by chain, budget optimization algorithms, and strategy templates

### cross-chain

Route cross-chain token transfers via the optimal bridge, compare fees and speeds, monitor bridge transaction status, assess bridge security, and manage multi-chain portfolios.

**Capabilities**:
- Optimal bridge route selection (cheapest, fastest, most secure, or balanced)
- Detailed fee breakdown estimation including gas, bridge fees, and slippage
- Bridge transaction lifecycle monitoring with status tracking
- Bridge security scoring (0-100) across 6 weighted components
- Pre-bridge liquidity verification
- Multi-chain balance aggregation and rebalancing recommendations
- Large transfer guidance and emergency procedures

**Reference Files**:
- `skills/cross-chain/references/bridge-protocols.md` -- Detailed profiles for Wormhole, Stargate, LayerZero, Across, Hop, and Synapse
- `skills/cross-chain/references/risk-assessment.md` -- Security scoring methodology, historical exploit analysis, and risk mitigation strategies

## Project Structure

```
lucid-defi/
  skill.yaml                  # Package manifest
  package.json                # npm package descriptor
  openclaw.plugin.json        # OpenClaw plugin descriptor
  .claude-plugin/
    plugin.json               # Claude plugin descriptor
  HEARTBEAT.md                # Periodic monitoring checks
  README.md                   # This file
  .gitignore
  skills/
    yield-management/
      SKILL.md                # Yield management skill definition
      references/
        il-calculator.md      # Impermanent loss formulas and examples
        protocols.md          # DeFi protocol details and risk profiles
        position-types.md     # Position type risk/return profiles
    airdrop-farming/
      SKILL.md                # Airdrop farming skill definition
      references/
        eligibility-criteria.md  # Airdrop criteria templates and scoring
        farming-strategies.md    # ROI formulas and optimization algorithms
    cross-chain/
      SKILL.md                # Cross-chain bridging skill definition
      references/
        bridge-protocols.md   # Bridge protocol details and comparisons
        risk-assessment.md    # Bridge security scoring and exploit history
```

## Installation

### Claude Code

```bash
npm install lucid-defi
```

Or add to your project's `.claude/plugins`:

```json
{
  "plugins": ["lucid-defi"]
}
```

### OpenClaw

Add `lucid-defi` as a dependency in your OpenClaw project configuration.

## Heartbeat

The `HEARTBEAT.md` file defines periodic checks that agents should perform:

- **DeFi Position Health**: Health factors, IL monitoring, yield rate changes, TVL trends
- **Airdrop Deadlines**: Snapshot dates, claim windows, farming progress, new discoveries
- **Bridge Transaction Monitoring**: Pending transfers, stuck transactions, bridge health, approval hygiene

## Related Packages

- `lucid-trade` -- Crypto trading intelligence (technical analysis, execution, risk management, smart money tracking, DeFi safety, tax accounting)