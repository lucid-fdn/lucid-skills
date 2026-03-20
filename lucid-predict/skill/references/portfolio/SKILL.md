---
name: portfolio
description: "Prediction market position sizing, PnL tracking, exposure analysis, and calibration metrics"
---

# Portfolio Management

Size positions, track PnL, analyze exposure, and monitor calibration. In v5, portfolio management is powered by the `lucid_size` and `lucid_calibrate` brain tools.

## Brain Tools

| Tool | Use For |
|------|---------|
| `lucid_size` | Portfolio-level Kelly sizing for multiple positions at once |
| `lucid_calibrate` | Brier score, calibration curve, overconfidence analysis |
| `lucid_evaluate` | Single-market evaluation with position sizing recommendation |

## Position Sizing (`lucid_size`)

Pass an array of positions with price and probability estimates:

```json
{
  "positions": [
    {"price": 0.40, "probability": 0.55, "label": "Bitcoin > 100k", "platform": "polymarket"},
    {"price": 0.70, "probability": 0.80, "label": "Fed rate cut", "platform": "kalshi"}
  ],
  "bankroll": 10000,
  "maxFraction": 0.25
}
```

Returns per-position Kelly sizing plus total allocation and remaining bankroll.

## Calibration Tracking (`lucid_calibrate`)

Pass an array of past forecasts with outcomes:

```json
{
  "forecasts": [
    {"predictedProbability": 0.80, "actualOutcome": 1},
    {"predictedProbability": 0.60, "actualOutcome": 0},
    {"predictedProbability": 0.90, "actualOutcome": 1}
  ]
}
```

Returns:
- **Brier score** (0 = perfect, 1 = worst)
- **Calibration buckets** (predicted vs actual per decile)
- **Overconfidence score** (positive = overconfident)
- **Rating** (excellent / good / fair / poor)

## PnL Calculation Formulas

### Unrealized PnL (Open Positions)

```
current_value  = shares x current_price
unrealized_pnl = current_value - cost_basis
roi_pct        = ((current_value - cost_basis) / cost_basis) x 100
```

### Realized PnL (Resolved Markets)

```
If outcome won:  exit_value = shares x 1.00
If outcome lost: exit_value = shares x 0.00
realized_pnl = exit_value - cost_basis
```

## Exposure Analysis

### Concentration Risk

```
largest_position_pct = max(current_value) / total_exposure x 100
```

Warning threshold: > 30% in a single position.

### Platform Diversification

Alert if any single platform > 70% of total exposure.

### Category Diversification

Alert if any single category > 50% of total exposure.

See `references/metrics.md` for the consolidated portfolio metrics reference.
