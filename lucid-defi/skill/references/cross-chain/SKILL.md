---
name: cross-chain
description: "Cross-chain bridge routing, fee comparison, transaction monitoring, and security assessment for crypto bridging"
---

# Cross-Chain

Route cross-chain token transfers via the optimal bridge, compare fees and speeds, monitor bridge transaction status, assess bridge security, and manage multi-chain portfolios.

## Bridging Procedure

When the user asks to bridge tokens or compare bridge options, follow this procedure:

1. **Identify the bridging parameters**:
   - Source chain
   - Destination chain
   - Token to bridge
   - Amount
   - Priority: cheapest, fastest, or most secure

2. **Query available routes** from bridge aggregators and individual bridge protocols.

3. **Compare routes** on cost, speed, and security (see route comparison below).

4. **Recommend the optimal route** based on user priority.

5. **Monitor the transaction** through completion if executed.

## Supported Chains

| Chain | Chain ID | Native Token | Bridge Support |
|-------|----------|-------------|---------------|
| Ethereum | 1 | ETH | All bridges |
| Solana | solana | SOL | Wormhole, deBridge |
| BSC | 56 | BNB | Stargate, LayerZero, Across |
| Arbitrum | 42161 | ETH | Stargate, Across, Hop, Synapse |
| Base | 8453 | ETH | Stargate, Across, Hop |
| Polygon | 137 | MATIC | Stargate, Across, Hop, Synapse |
| Optimism | 10 | ETH | Stargate, Across, Hop, Synapse |
| Avalanche | 43114 | AVAX | Stargate, Wormhole, LayerZero, Synapse |

## Route Comparison

### Cost Components

```
Total Bridge Cost = Gas Fee (source) + Bridge Fee + Gas Fee (destination) + Slippage

Gas Fee (source):
  Transaction gas on source chain to initiate bridge
  Varies by chain congestion

Bridge Fee:
  Protocol fee charged by the bridge (fixed or percentage)
  Typically 0.01% - 0.3% of amount

Gas Fee (destination):
  Some bridges require destination gas
  Others include it in the bridge fee (relayer pays)

Slippage:
  Difference between quoted and actual received amount
  Higher for larger amounts or low-liquidity routes
```

### Speed Categories

| Speed | Time Range | Use Case |
|-------|-----------|----------|
| Fast | < 5 minutes | Urgent transfers, arbitrage |
| Standard | 5-30 minutes | Normal transfers |
| Slow | 30 min - 2 hours | Large transfers prioritizing cost |
| Very Slow | 2-7 hours | Native bridges (L2 -> L1 rollup exits) |

### Route Selection Algorithm

```
function selectOptimalRoute(routes, priority, amount):
    # Filter out routes that don't support the token/chain pair
    valid_routes = filter(routes, supports(source, dest, token))

    # Filter out routes with insufficient liquidity
    valid_routes = filter(valid_routes, liquidity >= amount * 1.1)

    if priority == "cheapest":
        return sorted(valid_routes, by: total_cost, ascending)[0]

    elif priority == "fastest":
        return sorted(valid_routes, by: estimated_time, ascending)[0]

    elif priority == "most_secure":
        return sorted(valid_routes, by: security_score, descending)[0]

    elif priority == "balanced":
        # Weighted score: 40% cost, 30% speed, 30% security
        for each route:
            route.score = (
                (1 - normalize(route.cost)) * 0.40 +
                (1 - normalize(route.time)) * 0.30 +
                normalize(route.security_score) * 0.30
            )
        return sorted(valid_routes, by: score, descending)[0]
```

### Route Comparison Table Format

```
Bridging: 1.0 ETH from Ethereum -> Arbitrum

| Bridge    | Fee      | Est. Time | Output     | Security | Route           |
|-----------|----------|-----------|------------|----------|-----------------|
| Stargate  | $2.50    | ~2 min    | 0.9990 ETH | 85/100   | Direct          |
| Across    | $1.80    | ~3 min    | 0.9992 ETH | 80/100   | Direct          |
| Hop       | $3.20    | ~5 min    | 0.9985 ETH | 75/100   | Via AMM         |
| Synapse   | $2.80    | ~5 min    | 0.9988 ETH | 75/100   | Via nETH        |
| Native    | $8.00    | ~7 days   | 1.0000 ETH | 95/100   | Rollup bridge   |

Recommended: Across (cheapest with good speed and security)
```

## Bridge Protocols

See `references/bridge-protocols.md` for detailed protocol information.

### Protocol Quick Reference

| Protocol | Mechanism | Speed | Typical Fee | Security Model |
|----------|----------|-------|-------------|---------------|
| Wormhole | Message passing | 5-15 min | 0.01-0.1% | Guardian network (19 validators) |
| Stargate | Liquidity pools | 1-5 min | 0.06% | LayerZero oracles + relayers |
| LayerZero | Message protocol | 1-5 min | Gas only | Ultra-light node + oracle |
| Across | Optimistic | 1-5 min | 0.04-0.12% | Optimistic verification + UMA |
| Hop | AMM | 5-15 min | 0.04-0.3% | Bonded relayers + AMM |
| Synapse | AMM + message | 5-15 min | 0.05-0.2% | AMM liquidity + validators |

## Fee Estimation

### Detailed Fee Breakdown

```
function estimateBridgeFee(bridge, source_chain, dest_chain, token, amount):
    # Source chain gas
    source_gas = estimateGas(bridge.source_contract, source_chain)
    source_gas_usd = source_gas * gasPrice(source_chain) * nativeTokenPrice(source_chain)

    # Bridge protocol fee
    bridge_fee = amount * bridge.fee_percentage
    # Some bridges have minimum fees
    bridge_fee = max(bridge_fee, bridge.minimum_fee)

    # Destination gas (if not included by relayer)
    if bridge.relayer_pays_dest_gas:
        dest_gas_usd = 0
    else:
        dest_gas_usd = estimateGas(bridge.dest_contract, dest_chain) *
                       gasPrice(dest_chain) * nativeTokenPrice(dest_chain)

    # Slippage estimate for AMM-based bridges
    if bridge.uses_amm:
        slippage = estimateSlippage(amount, bridge.pool_liquidity)
    else:
        slippage = 0

    total_cost = source_gas_usd + bridge_fee + dest_gas_usd + slippage
    output_amount = amount - bridge_fee - slippage

    return {
        source_gas: source_gas_usd,
        bridge_fee: bridge_fee,
        dest_gas: dest_gas_usd,
        slippage: slippage,
        total_cost: total_cost,
        output_amount: output_amount,
        effective_fee_pct: (1 - output_amount / amount) * 100
    }
```

### Fee Estimates by Route

| Route | Typical Fee Range | Gas Component |
|-------|------------------|---------------|
| Ethereum -> L2 | $5-50 | High source gas |
| L2 -> Ethereum | $1-10 + wait time | Low source gas, slow native exit |
| L2 -> L2 | $0.50-5 | Low both sides |
| Ethereum -> Solana | $5-30 | Ethereum gas + bridge fee |
| Solana -> Ethereum | $1-20 | Low source, bridge fee dominant |
| BSC -> L2 | $1-5 | Low both sides |

## Transaction Monitoring

### Bridge Transaction Lifecycle

```
INITIATED -> PENDING -> CONFIRMED -> FINALIZED -> COMPLETED

INITIATED:   Source chain transaction submitted to bridge contract
PENDING:     Transaction included in source chain block, waiting for confirmations
CONFIRMED:   Sufficient confirmations on source chain, bridge processing
FINALIZED:   Bridge has relayed/proven the message to destination chain
COMPLETED:   Tokens received in destination wallet

Time per stage varies by bridge:
  INITIATED -> PENDING:     1-30 seconds (source block time)
  PENDING -> CONFIRMED:     1-15 minutes (block confirmations)
  CONFIRMED -> FINALIZED:   Bridge-specific (seconds to hours)
  FINALIZED -> COMPLETED:   Near-instant once finalized
```

### Tracking Endpoints

| Bridge | Track Via | URL Format |
|--------|----------|-----------|
| Wormhole | Wormhole Explorer | `https://wormholescan.io/#/tx/{txHash}` |
| Stargate | LayerZero Scan | `https://layerzeroscan.com/tx/{txHash}` |
| Across | Across Explorer | `https://app.across.to/transactions?hash={txHash}` |
| Hop | Hop Explorer | `https://explorer.hop.exchange/tx/{txHash}` |
| Synapse | Synapse Explorer | `https://explorer.synapseprotocol.com/tx/{txHash}` |

### Transaction Status Check

```
function checkBridgeStatus(txHash, bridge):
    # Query bridge-specific API for status
    status = bridge.getTransactionStatus(txHash)

    return {
        status: status.state,  # PENDING, CONFIRMED, FINALIZED, COMPLETED
        source_chain: status.source_chain,
        dest_chain: status.dest_chain,
        source_tx: status.source_tx_hash,
        dest_tx: status.dest_tx_hash,  # null if not yet completed
        amount: status.amount,
        token: status.token,
        estimated_completion: status.eta,
        confirmations: status.source_confirmations + "/" + status.required_confirmations
    }
```

### Monitoring Alerts

| Alert | Trigger | Action |
|-------|---------|--------|
| Transaction Completed | Dest chain tx confirmed | Notify user, verify received amount |
| Transaction Delayed | Time > 2x estimated | Check bridge status, advise patience |
| Transaction Failed | Source tx reverted | Advise retry, check gas/approval |
| Bridge Congested | Queue time > 30 min | Suggest alternative bridge |
| Funds Stuck | > 24h without completion | Escalate — check bridge support channels |

## Security Assessment

See `references/risk-assessment.md` for detailed bridge security scoring.

### Quick Security Check

Before using any bridge, verify:

```
Security Checklist:
  [ ] Bridge TVL > $100M (sufficient liquidity and battle-testing)
  [ ] No exploits in past 6 months
  [ ] Professional audit completed
  [ ] Active bug bounty program
  [ ] Multi-sig or decentralized validation
  [ ] Transaction has been verified on source chain

Risk Level:
  All checks pass:     LOW RISK
  1-2 checks fail:     MEDIUM RISK (proceed with caution)
  3+ checks fail:      HIGH RISK (consider alternative)
```

## Liquidity Checking

### Pre-Bridge Liquidity Verification

```
function checkBridgeLiquidity(bridge, dest_chain, token, amount):
    available_liquidity = bridge.getLiquidity(dest_chain, token)

    if available_liquidity >= amount * 1.5:
        return { status: "SUFFICIENT", slippage_risk: "LOW" }
    elif available_liquidity >= amount:
        return { status: "TIGHT", slippage_risk: "MEDIUM" }
    else:
        return { status: "INSUFFICIENT", slippage_risk: "HIGH",
                 max_bridge_amount: available_liquidity * 0.8 }
```

### Large Transfer Guidance

| Amount | Recommendation |
|--------|---------------|
| < $10K | Use any reputable bridge; single transaction |
| $10K - $100K | Compare multiple bridges; check liquidity |
| $100K - $1M | Split across 2-3 bridges; verify liquidity on each |
| > $1M | Contact bridge team; use native bridges when possible; split transfers |

## Multi-Chain Portfolio Management

### Cross-Chain Balance Aggregation

```
function getMultiChainBalance(wallets):
    total_balance = {}

    for each wallet in wallets:
        for each chain in supported_chains:
            tokens = getTokenBalances(wallet.address, chain)
            for each token in tokens:
                key = token.symbol
                total_balance[key] = (total_balance[key] || 0) + token.value_usd

    return total_balance

Present as:
  Token | Ethereum | Solana | Arbitrum | Base | Total
  ETH   | $5,000   | -      | $2,000   | $500 | $7,500
  USDC  | $3,000   | $1,000 | $500     | $200 | $4,700
```

### Rebalancing Across Chains

```
function recommendRebalancing(balances, target_allocation):
    recommendations = []

    for each chain:
        current_pct = balances[chain] / total_balance * 100
        target_pct = target_allocation[chain]
        diff = current_pct - target_pct

        if abs(diff) > 5:  # 5% threshold to trigger rebalancing
            if diff > 0:
                amount = total_balance * diff / 100
                recommendations.push("MOVE $" + amount + " FROM " + chain)
            else:
                amount = total_balance * abs(diff) / 100
                recommendations.push("MOVE $" + amount + " TO " + chain)

    # For each recommended move, find optimal bridge route
    for each recommendation:
        route = selectOptimalRoute(...)
        recommendation.route = route

    return recommendations
```