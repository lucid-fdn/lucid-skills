# Odds Analysis Formula Reference

A consolidated reference of all math functions implemented in `src/math/`.

---

## Odds Conversion (`src/math/odds.ts`)

| Conversion | Formula |
|-----------|---------|
| Probability to Decimal | `decimal = 1 / probability` |
| Decimal to Probability | `probability = 1 / decimal` |
| Decimal to American (+) | `american = (decimal - 1) x 100` (when decimal >= 2.00) |
| Decimal to American (-) | `american = -100 / (decimal - 1)` (when decimal < 2.00) |
| American (+) to Decimal | `decimal = (american / 100) + 1` |
| American (-) to Decimal | `decimal = (100 / |american|) + 1` |
| Price to Implied Prob | `implied_probability = price` (binary markets) |
| Fractional to Decimal | `decimal = (numerator / denominator) + 1` |
| Decimal to Fractional | `fractional = (decimal - 1) / 1` (simplify) |

---

## Expected Value (`src/math/ev.ts`)

```
payout         = stake / price
expectedPayout = probability x payout
ev             = expectedPayout - stake
roiPct         = (ev / stake) x 100
edgePct        = (probability - price) x 100
is_positive_ev = ev > 0
```

Guards: returns zero result if `price <= 0`, `price >= 1`, or `stake <= 0`.

---

## Kelly Criterion (`src/math/kelly.ts`)

### Full Kelly

```
b  = (1 / price) - 1
p  = estimated probability of winning
q  = 1 - p
f* = max(0, (b x p - q) / b)
```

### Half-Kelly (Conservative)

```
halfKelly = f* / 2
```

### Position Sizing

```
recommended   = min(halfKelly, maxFraction)     -- maxFraction default = 0.25
positionSize  = bankroll x recommended
```

---

## Recommendation Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Kelly | <= 0 | Don't bet |
| Edge | >= 15% | High confidence |
| Edge | >= 5% | Medium confidence |
| Edge | < 2% | Avoid |
| Edge > 5% AND Kelly > 0 | -- | Buy |

---

## Market Efficiency (`src/math/efficiency.ts`)

### Overround

```
overround = (sum(all_prices) - 1) x 100%
```

### Vig

```
total = sum(all_prices)
vig   = ((total - 1) / total) x 100%
```

### Fair Prices

```
fair_price[i] = price[i] / sum(all_prices)
```

### Efficiency Test

```
is_efficient = |overround| <= 5%
```

---

## Liquidity Score (`src/math/liquidity.ts`)

```
volume_component    = min(50, (volume_usd / 100,000) x 50)
liquidity_component = min(50, (liquidity_usd / 50,000) x 50)
liquidity_score     = volume_component + liquidity_component
```

| Score Range | Rating |
|-------------|--------|
| 0-30 | Low liquidity |
| 30-70 | Medium liquidity |
| 70-100 | High liquidity |

---

## Time Value (`src/math/time-value.ts`)

### Days to Close

```
days = ceil((closeDate - now) / 86400000)
```

### Time Decay Score (0-1)

```
if days <= 0: 0
if days >= 365: 1
else: 1 - e^(-days/90)
```

### Near-Certain Expiry Detection

```
isNearCertain = days <= 7 AND price >= threshold (default 0.90)
```

Used by `lucid_discover` to auto-detect high-probability bonding opportunities (1800% annualized).

---

## Bayesian Estimation (`src/math/bayesian.ts`)

### Tetlock Method

Start from base rate (outside view), apply adjustments (inside view) multiplicatively:

```
For each adjustment:
  if direction == 'up':   prob = prob + (1 - prob) x magnitude
  if direction == 'down': prob = prob - prob x magnitude
```

Clamped to [0.01, 0.99] to avoid certainty.

### Classical Bayesian Update

```
posterior = (prior x likelihoodRatio) / (prior x likelihoodRatio + (1 - prior))
```

---

## Brier Score (`src/math/brier.ts`)

```
brierScore = (1/N) x sum((predicted - actual)^2)
```

| Score | Rating |
|-------|--------|
| < 0.1 | Excellent |
| < 0.2 | Good |
| < 0.3 | Fair |
| >= 0.3 | Poor |

### Overconfidence Score

```
overconfidence = weighted_avg(predicted - actual) across calibration buckets
```

Positive = overconfident, Negative = underconfident.

---

## Correlation (`src/math/correlation.ts`)

### Title Similarity

```
score = shared_words / max(words_in_A, words_in_B)
```

Match threshold: >= 0.60 (60% word overlap).

### Arbitrage Calculation

```
combinedCost = yesPrice + noPrice
profit = 1.0 - combinedCost    (if combinedCost < 1.0)
profitPct = (profit / combinedCost) x 100
```

Both directions checked: YES_A + NO_B and YES_B + NO_A.
