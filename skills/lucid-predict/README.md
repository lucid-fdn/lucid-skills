# Lucid Predict

Edge Hunter — prediction market intelligence with 7 brain tools for systematic edge detection across Polymarket, Manifold, and Kalshi.

## v5.0 — TypeScript MCP Server

Lucid Predict v5 is a full TypeScript MCP server with a brain layer that combines EV analysis, Kelly criterion sizing, cross-platform arbitrage, Bayesian calibration, and time-decay scoring into structured verdicts.

### Brain Tools

| Tool | Description |
|------|-------------|
| **lucid_evaluate** | Deep evaluation of a single market — EV, Kelly, efficiency, time decay → BUY_YES / BUY_NO / SKIP / HEDGE |
| **lucid_discover** | Scan markets across all platforms for edge opportunities, sorted by score |
| **lucid_arbitrage** | Cross-platform arbitrage detection — match markets and find mispricings |
| **lucid_correlate** | [Coming soon] Correlation lag exploitation between related markets |
| **lucid_size** | Portfolio-level Kelly sizing with correlation adjustments |
| **lucid_calibrate** | Brier score, calibration curve, and overconfidence analysis |
| **lucid_pro** | Direct access to 14 math functions and platform adapters |

### Edge Strategies

- **High-probability bonding**: Markets at >=90% with <=7 days to close (1800% annualized)
- **Cross-platform arbitrage**: YES_A + NO_B < $1.00 = guaranteed profit (both directions checked)
- **Bayesian calibration**: Tetlock superforecasting — base rate + multiplicative adjustments
- **Liquidity premium capture**: Find mispriced markets in low-liquidity pools
- **Correlation lag exploitation**: Related markets that haven't adjusted after a resolution (coming soon)

## Install

### Claude Code

```bash
claude install lucid-predict
```

### OpenClaw

```bash
openclaw install lucid-predict
```

### MCP Server (stdio)

```bash
npx @raijinlabs/predict
```

## Configuration

All configuration via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PREDICT_DEFAULT_BANKROLL` | `10000` | Default bankroll for Kelly sizing |
| `PREDICT_DEFAULT_MAX_FRACTION` | `0.25` | Max position size as fraction of bankroll |
| `PREDICT_MIN_SPREAD_PCT` | `3` | Minimum arbitrage spread to report |
| `PREDICT_POLYMARKET_API_URL` | `https://gamma-api.polymarket.com` | Polymarket API base URL |
| `PREDICT_MANIFOLD_API_URL` | `https://api.manifold.markets/v0` | Manifold API base URL |
| `PREDICT_KALSHI_API_URL` | `https://api.elections.kalshi.com/trade-api/v2` | Kalshi API base URL |
| `PREDICT_KALSHI_API_KEY` | _(none)_ | Kalshi API key (optional) |
| `PREDICT_LOG_LEVEL` | `info` | Log level (debug/info/warn/error) |

## Project Structure

```
lucid-predict/
  package.json                     # @raijinlabs/predict v5.0.0
  tsconfig.json                    # TypeScript strict, ES2022
  tsup.config.ts                   # 4 entry points (index, mcp, openclaw, bin)
  vitest.config.ts                 # 119 tests across 15 suites
  skill.yaml                       # Plugin manifest
  HEARTBEAT.md                     # Periodic monitoring checks
  src/
    index.ts                       # Barrel exports
    bin.ts                         # MCP stdio entry point
    mcp.ts                         # MCP server factory
    openclaw.ts                    # OpenClaw plugin registration
    domain.ts                      # PredictDomainAdapter for brain SDK
    config.ts                      # Zod-validated env config
    plugin-id.ts                   # Plugin metadata constants
    types/
      index.ts                     # Market, Outcome, PricePoint, Forecast, etc.
    utils/
      logger.ts                    # [predict] prefixed logger
      round.ts                     # Shared rounding utility
    math/
      ev.ts                        # Expected value calculator
      kelly.ts                     # Kelly criterion position sizing
      odds.ts                      # Odds format conversion
      efficiency.ts                # Market efficiency (overround, vig, fair prices)
      liquidity.ts                 # Liquidity scoring
      time-value.ts                # Time decay and near-certain expiry detection
      bayesian.ts                  # Bayesian probability estimation (Tetlock method)
      brier.ts                     # Brier score and calibration tracking
      correlation.ts               # Title matching and arbitrage calculation
      index.ts                     # Math barrel export
    adapters/
      types.ts                     # IPlatformAdapter interface
      registry.ts                  # PlatformRegistry
      polymarket.ts                # Polymarket Gamma API adapter
      manifold.ts                  # Manifold v0 API adapter
      kalshi.ts                    # Kalshi v2 API adapter
      index.ts                     # Adapter barrel export
    brain/
      types.ts                     # EvaluateResult, MarketVerdict, EdgeType, etc.
      analysis.ts                  # runEvaluation() — combines all math into a verdict
      tools.ts                     # 7 brain MCP tools
      formatter.ts                 # Human-readable output formatters
      index.ts                     # Brain barrel export
    tools/
      index.ts                     # ToolDefinition, ToolDependencies, createAllTools
  skills/
    market-research/SKILL.md       # Domain knowledge: market search and analysis
    odds-analysis/SKILL.md         # Domain knowledge: EV, Kelly, efficiency
    arbitrage/SKILL.md             # Domain knowledge: cross-platform arbitrage
    portfolio/SKILL.md             # Domain knowledge: position and PnL tracking
  .claude-plugin/
    plugin.json                    # Claude Code manifest
  openclaw.plugin.json             # OpenClaw manifest
```

## Development

```bash
npm install
npm run typecheck          # tsc --noEmit
npm test                   # vitest run (119 tests)
npm run build              # tsup (CJS + ESM + DTS)
```

## Part of Lucid Skills

This package is part of the [lucid-skills](https://github.com/raijinlabs/lucid-skills) monorepo.

## License

MIT
