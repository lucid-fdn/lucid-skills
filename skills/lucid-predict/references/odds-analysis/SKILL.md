---
name: odds-analysis
description: "Expected value, Kelly criterion, odds conversion, market efficiency, Bayesian estimation, and calibration tracking"
---

# Odds Analysis

Calculate expected value, size positions with the Kelly criterion, convert between odds formats, assess market efficiency, and track calibration. All formulas are implemented in `src/math/` and exposed via the brain tools.

## Brain Tools

| Tool | Use For |
|------|---------|
| `lucid_evaluate` | Combines EV, Kelly, efficiency, and time decay into a single verdict |
| `lucid_size` | Portfolio-level Kelly sizing for multiple positions |
| `lucid_calibrate` | Brier score, calibration curve, overconfidence detection |
| `lucid_pro` | Direct access to individual math functions |

## Expected Value (`src/math/ev.ts`)

```
payout         = stake / price
expectedPayout = probability x payout
ev             = expectedPayout - stake
roiPct         = (ev / stake) x 100
edgePct        = (probability - price) x 100
```

### Worked Example

- Stake: $100, Market price: 0.40, Your probability: 0.55

```
payout = 100 / 0.40 = $250.00
expectedPayout = 0.55 x 250 = $137.50
ev = 137.50 - 100 = $37.50  (+EV, 15% edge, 37.5% ROI)
```

## Kelly Criterion (`src/math/kelly.ts`)

```
f* = (b x p - q) / b
b  = (1/price) - 1    (net odds)
```

- **Half-Kelly**: `f*/2` — recommended for real-world use (probability uncertainty, drawdown aversion)
- **Max fraction cap**: 25% of bankroll by default
- If `f* <= 0`: no edge, don't bet

### Worked Example

- Bankroll: $10,000, Price: 0.40, Probability: 0.55

```
b = 1.50, f* = 0.25, halfKelly = 0.125
Position: $10,000 x 0.125 = $1,250
```

## Bayesian Estimation (`src/math/bayesian.ts`)

Tetlock superforecasting method — start from base rate, apply adjustments multiplicatively:

- **Up**: `prob = prob + (1 - prob) x magnitude`
- **Down**: `prob = prob - prob x magnitude`

Clamped to [0.01, 0.99]. Used by `lucid_evaluate` when adjustments are provided.

## Market Efficiency (`src/math/efficiency.ts`)

- **Overround**: `(sum(prices) - 1) x 100%` — book margin
- **Vig**: `((sum - 1) / sum) x 100%`
- **Fair prices**: `price[i] / sum(prices)` — remove the vig
- **Efficient**: `|overround| <= 5%`

## Calibration (`src/math/brier.ts`)

- **Brier score**: `(1/N) x sum((predicted - actual)^2)` — 0 = perfect, 1 = worst
- **Calibration buckets**: 10 bins (0.0-0.1, ..., 0.9-1.0) comparing predicted vs actual rates
- **Overconfidence**: positive = overconfident, negative = underconfident

| Brier Score | Rating |
|-------------|--------|
| < 0.1 | Excellent |
| < 0.2 | Good |
| < 0.3 | Fair |
| >= 0.3 | Poor |

## Verdict Logic (`src/brain/analysis.ts`)

The `runEvaluation()` function combines all math into a structured `EvaluateResult`:

1. Calculate EV and edge%
2. Run Kelly criterion
3. Analyze market efficiency
4. Score liquidity (0-100)
5. Calculate time decay
6. Determine verdict: **BUY_YES** / **BUY_NO** / **SKIP** / **HEDGE**

See `references/formulas.md` for the consolidated formula reference.
