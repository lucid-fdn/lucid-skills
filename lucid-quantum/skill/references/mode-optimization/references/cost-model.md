# Cost Model Reference

GPU cost efficiency model for mode priority optimization.

## Cost Metric

The primary efficiency metric is **GPU-seconds per billion keys checked**:

```
cost = (gpu_seconds_spent / keys_checked) × 1,000,000,000
```

Lower is better. This normalizes across modes with different keyspace sizes.

## Baseline Costs by Mode Category

| Category | Typical Cost (GPU-sec/Bkeys) | Reason |
|----------|------------------------------|--------|
| Simple PRNG (1, 2) | 5-15 | Fast key generation, simple state |
| Mersenne Twister (5, 14, 15, 16) | 20-50 | MT state expansion overhead |
| SHA256-based (3, 9, 11, 13, 21) | 50-100 | SHA256 computation per key |
| OpenSSL (10) | 30-60 | Complex state reconstruction |
| V8 engines (17, 18) | 40-80 | JavaScript engine PRNG emulation |
| Strong random (0) | 100+ | Full entropy, no shortcut |

## Priority Weight Formula

```
final_weight = min(base_weight + fp_boost, 10.0)

where:
  base_weight = 1.0 + avg_triage_score × 7.0    # Range: 1.0 – 8.0
  fp_boost = min(fingerprint_probability_sum, 2.0) # Range: 0.0 – 2.0
```

### Weight Effects on GPU Allocation

`work_service._get_weighted_mode_order()` distributes work:

| Weight | Relative GPU Time | Description |
|--------|-------------------|-------------|
| 10.0 | Maximum | Highest priority — strong evidence |
| 7.0-9.9 | High | Good triage score + fingerprint match |
| 4.0-6.9 | Medium | Moderate triage score |
| 1.0-3.9 | Low | Baseline allocation |
| 0.0 | None | Exhausted or disabled |

## Cost Efficiency Alerts

| Condition | Severity | Action |
|-----------|----------|--------|
| Cost > 200 GPU-sec/Bkeys | Warning | Review mode — may be misconfigured |
| Cost > 500 GPU-sec/Bkeys | Critical | Consider disabling mode |
| Cost variance > 10x between modes | Info | Rebalance priorities |
| Estimated total completion > 1 year | Warning | Focus on high-probability modes |

## Optimization Triggers

Auto-optimize should run when:
1. New targets are added (new intelligence data available)
2. Fingerprint results change (new wallet identifications)
3. Mode exhaustion occurs (redistribute freed GPU time)
4. Cost analysis shows significant inefficiency
5. Every 24 hours as a baseline refresh

## Resource Allocation Example

Given 3 workers at 500M keys/sec each (1.5B total):

| Mode | Weight | Allocation | Effective Speed |
|------|--------|-----------|-----------------|
| Mode 17 (V8 MWC1616) | 10.0 | 40% | 600M keys/sec |
| Mode 5 (MT19937) | 7.0 | 25% | 375M keys/sec |
| Mode 1 (LCG glibc) | 5.0 | 20% | 300M keys/sec |
| Mode 3 (SHA256-seq) | 2.0 | 10% | 150M keys/sec |
| Mode 0 (Strong random) | 1.0 | 5% | 75M keys/sec |
