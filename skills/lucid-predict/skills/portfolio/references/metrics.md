# Portfolio Metrics Reference

Consolidated reference of all portfolio formulas and metrics. Position sizing is implemented in `src/brain/tools.ts` (`lucid_size`), calibration in `src/math/brier.ts` (`lucid_calibrate`).

---

## Kelly Position Sizing

```
b  = (1 / price) - 1
f* = max(0, (b x p - q) / b)
halfKelly = f* / 2
recommended = min(halfKelly, maxFraction)
positionSize = bankroll x recommended
```

Default `maxFraction` = 0.25 (25% cap per position).

---

## PnL Formulas

### Unrealized (Open)

```
current_value  = shares x current_price
unrealized_pnl = current_value - cost_basis
roi_pct        = ((current_value - cost_basis) / cost_basis) x 100
```

### Realized (Closed)

```
realized_pnl = exit_value - cost_basis
roi_pct      = ((exit_value - cost_basis) / cost_basis) x 100
```

Resolution payouts:
- Won: `exit_value = shares x 1.00`
- Lost: `exit_value = shares x 0.00`

---

## Portfolio Summary

```
total_invested      = sum(cost_basis) for all positions
total_current_value = sum(current_value) for open + sum(exit_value) for closed
total_pnl           = total_current_value - total_invested
total_pnl_pct       = (total_pnl / total_invested) x 100
```

---

## Calibration Metrics

### Brier Score

```
brierScore = (1/N) x sum((predicted - actual)^2)
```

| Score | Rating |
|-------|--------|
| < 0.1 | Excellent |
| < 0.2 | Good |
| < 0.3 | Fair |
| >= 0.3 | Poor |

### Overconfidence

```
overconfidence = weighted_avg(predicted - actual) across calibration buckets
```

Positive = overconfident, Negative = underconfident.

---

## Exposure Analysis

### By Platform

```
platform_exposure = sum(current_value) per platform
platform_pct      = (platform_exposure / total_exposure) x 100
```

Alert: any platform > 70%.

### By Category

```
category_exposure = sum(current_value) per category
category_pct      = (category_exposure / total_exposure) x 100
```

Alert: any category > 50%.

### Concentration

```
total_exposure       = sum(current_value) for all open positions
largest_position_pct = max(current_value) / total_exposure x 100
```

Alert: largest position > 30%.

---

## Alert Thresholds

| Alert | Condition |
|-------|-----------|
| Loss threshold | `roi_pct < -20%` on any position |
| Portfolio drawdown | `total_pnl_pct < -10%` |
| Over-concentration | `largest_position_pct > 30%` |
| Platform concentration | Any platform > 70% |
| Category concentration | Any category > 50% |
