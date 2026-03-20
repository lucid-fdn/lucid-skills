# Bridge Protocols Reference

Detailed protocol information, supported chains, typical fees, and integration details.

## Wormhole

### Overview
Cross-chain message passing protocol with a guardian network of 19 validators. Supports EVM chains, Solana, and other ecosystems.

### Architecture
```
Security Model: Guardian Network
  - 19 guardian validators (well-known entities)
  - 13/19 multi-sig required to validate messages
  - Guardians observe source chain and sign attestations
  - Attestation submitted to destination chain to release funds

Message Flow:
  Source Chain -> Wormhole Core Contract -> Guardian Network -> Destination Chain
```

### Supported Chains

| Chain | Support Level | Token Standard |
|-------|-------------|---------------|
| Ethereum | Full | ERC-20, Native ETH |
| Solana | Full | SPL tokens, Native SOL |
| BSC | Full | BEP-20, Native BNB |
| Avalanche | Full | ERC-20, Native AVAX |
| Polygon | Full | ERC-20, Native MATIC |
| Arbitrum | Full | ERC-20 |
| Optimism | Full | ERC-20 |
| Base | Full | ERC-20 |

### Fees
```
Bridge Fee: Varies by route, typically 0.01-0.1% of amount
Relayer Fee: Gas on destination chain (paid by relayer, included in fee)
Minimum Fee: Varies by route ($0.50-$5)
```

### Speed
- Standard: 5-15 minutes (waiting for guardian signatures)
- Solana exits: ~15 seconds (fast finality)
- Ethereum exits: ~15 minutes (block confirmations)

### Notable History
- **February 2022**: Exploited for $326M (vulnerability in Solana contract verification)
- Post-exploit: Completely rewritten and re-audited
- Current version considered secure with improved architecture

### Integration
```
Portal Bridge (UI): https://portalbridge.com/
API: Wormhole SDK / wormhole-connect widget
Explorer: https://wormholescan.io/
```

## Stargate (LayerZero)

### Overview
Omnichain liquidity transport protocol built on LayerZero messaging. Uses unified liquidity pools for instant guaranteed finality.

### Architecture
```
Security Model: LayerZero Ultra-Light Node + Oracle + Relayer
  - Oracle (Chainlink) provides block headers
  - Relayer provides transaction proofs
  - Both must agree for message to be validated
  - If either is compromised, the other prevents exploitation

Liquidity Model:
  - Unified liquidity pools on each chain
  - Delta algorithm ensures balanced liquidity across chains
  - Instant transfers (no waiting for validation if liquidity available)
```

### Supported Chains

| Chain | Pool Assets | Liquidity Depth |
|-------|-------------|----------------|
| Ethereum | USDC, USDT, ETH | High ($100M+) |
| Arbitrum | USDC, USDT, ETH | High |
| Optimism | USDC, USDT, ETH | High |
| Polygon | USDC, USDT | High |
| BSC | USDT, BUSD | Medium |
| Avalanche | USDC, USDT | Medium |
| Base | USDC, ETH | Medium |

### Fees
```
Bridge Fee: 0.06% of transfer amount (protocol fee)
LP Fee: Included in bridge fee (paid to liquidity providers)
Gas: Source chain gas only (relayer covers destination)
Minimum Fee: ~$0.50
```

### Speed
- **Typical: 1-5 minutes** (one of the fastest bridges)
- EVM -> EVM: 1-3 minutes
- Relies on LayerZero message confirmation

### Integration
```
Stargate UI: https://stargate.finance/transfer
SDK: @stargatefinance/stg-general-sdk
LayerZero Scan: https://layerzeroscan.com/
```

## LayerZero

### Overview
Omnichain interoperability protocol that enables lightweight cross-chain messaging. Stargate is built on top of it, but LayerZero itself supports generic message passing.

### Architecture
```
Ultra-Light Node (ULN):
  - Does not run a full node on each chain
  - Relies on two independent entities:
    1. Oracle: Provides block headers (e.g., Chainlink)
    2. Relayer: Provides transaction proofs
  - Message is valid only if Oracle AND Relayer agree
  - Application can choose their own Oracle and Relayer

MessageLib:
  - Configurable security library per application
  - DVN (Decentralized Verifier Network) in V2
```

### Supported Chains
50+ chains including all major EVM chains, Solana, Aptos

### Fees
```
Protocol Fee: None (LayerZero does not charge bridge fees)
Cost: Source gas + destination gas (paid by sender or application)
```

### Speed
- Depends on source chain finality
- EVM: 1-5 minutes typically
- Solana: < 1 minute

## Across Protocol

### Overview
Optimistic cross-chain bridge using competitive relayer network. Relayers front capital for fast transfers, then get reimbursed via UMA's optimistic oracle.

### Architecture
```
Security Model: Optimistic Verification via UMA Oracle
  1. User sends tokens to Across SpokePool on source chain
  2. Relayer sees the deposit and immediately fills on destination chain
  3. Relayer submits proof to UMA Oracle for reimbursement
  4. 2-hour optimistic challenge window
  5. If unchallenged, relayer is reimbursed from liquidity pool

Key advantage: Users receive funds instantly; the wait is for the relayer system.
```

### Supported Chains

| Chain | Native Support | Assets |
|-------|---------------|--------|
| Ethereum | Yes | ETH, USDC, USDT, WBTC, DAI |
| Arbitrum | Yes | ETH, USDC, USDT, WBTC |
| Optimism | Yes | ETH, USDC, USDT |
| Base | Yes | ETH, USDC |
| Polygon | Yes | ETH, USDC, USDT |
| zkSync | Yes | ETH, USDC |
| Linea | Yes | ETH, USDC |

### Fees
```
Bridge Fee: 0.04-0.12% (varies by route and liquidity)
LP Fee: Included in bridge fee
Gas: Source chain gas; relayer covers destination
Capital Fee: Based on relayer capital lockup time
```

### Speed
- **Very fast: 1-5 minutes** (relayers compete to fill quickly)
- Speed depends on relayer availability and route

### Integration
```
Across UI: https://app.across.to/
SDK: @across-protocol/sdk
API: https://app.across.to/api/suggested-fees
```

## Hop Protocol

### Overview
Cross-chain bridge using AMM and bonded relayers. Creates wrapped "hTokens" on each chain and uses AMMs for token conversion.

### Architecture
```
Security Model: Bonded Relayers + AMMs
  1. User deposits tokens to Hop bridge on source chain
  2. Bonder (bonded relayer) fronts tokens on destination chain
  3. Bonder submits proof to source chain for reimbursement
  4. AMMs on each chain facilitate conversion between hTokens and canonical tokens

Token Flow:
  Source Token -> Hop Bridge -> hToken -> AMM -> Canonical Token on Destination
```

### Supported Chains

| Chain | Support | Primary Assets |
|-------|---------|---------------|
| Ethereum | Yes | ETH, USDC, USDT, DAI, MATIC |
| Arbitrum | Yes | ETH, USDC, USDT, DAI |
| Optimism | Yes | ETH, USDC, USDT, DAI |
| Polygon | Yes | ETH, USDC, USDT, DAI, MATIC |
| Base | Yes | ETH, USDC |
| Gnosis | Yes | ETH, USDC, DAI |

### Fees
```
Bridge Fee: 0.04% (Bonder fee)
AMM Fee: 0.04% (for hToken -> canonical swap)
Destination Gas: Covered by Bonder
Total Effective Fee: ~0.08-0.30% depending on route and AMM slippage
```

### Speed
- **Standard: 5-15 minutes**
- Depends on Bonder speed and source chain finality

## Synapse Protocol

### Overview
Cross-chain bridge supporting multiple mechanisms: AMM-based bridging and message-passing for broader interoperability.

### Architecture
```
Two Bridging Modes:

1. Liquidity-Based (AMM):
   - nETH, nUSD stablecoin pools on each chain
   - Users swap into bridged asset, bridge, swap out on destination
   - Fast but limited to supported pool assets

2. Message-Based (Synapse Interchain Network):
   - Generic message passing for any token
   - Validator network attests to source chain events
   - Slower but supports more tokens
```

### Supported Chains

| Chain | AMM Pools | Message Bridge |
|-------|-----------|---------------|
| Ethereum | nETH, nUSD | Yes |
| Arbitrum | nETH, nUSD | Yes |
| Optimism | nETH, nUSD | Yes |
| Polygon | nUSD | Yes |
| BSC | nUSD | Yes |
| Avalanche | nETH, nUSD | Yes |
| Base | nETH | Yes |

### Fees
```
AMM Bridge: 0.05-0.20% (AMM swap fees on each side)
Message Bridge: Gas + protocol fee (varies)
```

### Speed
- AMM Bridge: 5-15 minutes
- Message Bridge: 10-30 minutes

## Protocol Comparison Summary

| Feature | Wormhole | Stargate | Across | Hop | Synapse |
|---------|----------|----------|--------|-----|---------|
| Speed | 5-15 min | 1-5 min | 1-5 min | 5-15 min | 5-15 min |
| Fee Range | 0.01-0.1% | 0.06% | 0.04-0.12% | 0.08-0.3% | 0.05-0.2% |
| Security Model | Guardian 13/19 | Oracle + Relayer | Optimistic (UMA) | Bonded Relayer | Validator Network |
| EVM Support | Yes | Yes | Yes | Yes | Yes |
| Solana Support | Yes | Limited | No | No | No |
| TVL | $500M+ | $300M+ | $100M+ | $50M+ | $50M+ |
| Audit Status | Multiple | Multiple | Multiple | Multiple | Multiple |
| Exploit History | 1 major (2022) | None | None | None | 1 medium (2022) |
| Best For | Multi-ecosystem | Fast EVM-EVM | Cheapest EVM | L2 transfers | Multi-asset |