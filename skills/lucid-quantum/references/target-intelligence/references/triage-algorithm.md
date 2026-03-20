# Triage Algorithm Reference

Detailed scoring algorithm for target classification and mode vulnerability assessment.

## Per-Mode Vulnerability Scoring

For each target address, the triage service computes a vulnerability score per mode (0.0 to 1.0):

```
score = Σ(feature_weight × feature_match)
```

### Feature Weights

| Feature | Weight | Source |
|---------|--------|--------|
| Wallet era match | 0.30 | First seen date vs. mode's temporal range |
| Transaction pattern | 0.25 | nLockTime, output ordering, tx_version |
| Balance significance | 0.15 | Higher balance → higher priority |
| Address type | 0.15 | P2PKH (legacy) → more vulnerable to PRNG modes |
| Known vulnerability | 0.15 | Matching known CVEs or disclosed weaknesses |

### Era Mapping

| Era | Date Range | Likely Modes |
|-----|-----------|--------------|
| Genesis | 2009-01 to 2010-06 | 1, 2, 6, 10 |
| Early | 2010-06 to 2012-01 | 1, 2, 5, 10, 17 |
| Mid | 2012-01 to 2014-06 | 5, 12, 14, 17 |
| Late | 2014-06 to 2016-01 | 17, 18 |
| Modern | 2016+ | 0 (unlikely vulnerable) |

## Temporal Narrowing

When the first on-chain appearance timestamp is known:

```
narrowed_start = first_seen - 7 days
narrowed_end = first_seen
keyspace_reduction = total_keyspace / narrowed_keyspace
```

For timestamp-seeded modes, this typically yields a **300x speedup** because:
- Total Unix timestamp range: 2009-01-03 to 2025-12-31 = ~535M seconds
- 7-day window: 604,800 seconds
- Reduction: 535M / 604,800 ≈ 885x (conservative estimate: 300x)

### Applicable Modes

Temporal narrowing applies to modes that use `time()` or similar as PRNG seed:

| Mode | Seed Resolution | Narrowed Keyspace |
|------|----------------|-------------------|
| 4 (Time-seeded glibc) | 1 second | 604,800 keys |
| 8 (Time-seeded MSVC) | 1 second | 604,800 keys |
| 5 (MT19937) | 1 second | 604,800 × MT expansion |
| 14 (PHP mt_rand) | 1 second | 604,800 seeds |
| 15 (Python random) | 1 second | 604,800 seeds |
| 16 (Ruby rand) | 1 second | 604,800 seeds |
| 12 (Java LCG) | 1 millisecond | 604,800,000 seeds |
| 22 (Timestamp-direct) | 1 second | 604,800 keys |

## Aggregate Scoring

When computing fleet-wide priority weights:

```
For each mode m:
  target_scores[m] = average of all targets' score for mode m
  fp_modes[m] = sum of fingerprint confidence for targets where m is in probable_modes

  base_weight = 1.0 + target_scores[m] × 7.0    # Range: 1.0 – 8.0
  fp_boost = min(fp_modes[m], 2.0)               # Range: 0.0 – 2.0
  final_weight = min(base_weight + fp_boost, 10.0)
```

## Classification Labels

| Label | Score Range | Action |
|-------|-----------|--------|
| `critical` | ≥ 0.8 | Immediate priority, maximum GPU allocation |
| `high` | 0.6 – 0.79 | Above-average allocation |
| `medium` | 0.4 – 0.59 | Standard allocation |
| `low` | 0.2 – 0.39 | Reduced allocation |
| `minimal` | < 0.2 | Background scanning only |
