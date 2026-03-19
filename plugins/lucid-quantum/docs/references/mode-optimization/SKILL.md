---
name: mode-optimization
description: "GPU mode priority optimization: cost efficiency analysis, auto-optimize from intelligence, and resource allocation"
version: 1.0.0
---

# Mode Optimization

Optimize how GPU time is allocated across 23 search modes. The auto-optimize pipeline bridges target intelligence (triage scores, fingerprints) with work distribution (priority weights).

## Procedure

1. **Analyze costs** — Call `quantum_cost` to see GPU cost per billion keys per mode
2. **Auto-optimize** — Call `quantum_optimize` to automatically set priority weights from intelligence data
3. **Verify** — Call `quantum_fleet` to confirm the new weight distribution makes sense
4. **Monitor** — Run `quantum_protect` periodically to detect mode stalls

## Auto-Optimize Algorithm

The `quantum_optimize` tool bridges intelligence → work distribution:

1. **Aggregate triage scores** — For each target with blockchain metadata, compute mode vulnerability probability. Average across all targets per mode.

2. **Aggregate fingerprints** — For each target with a wallet fingerprint (confidence > 0.3), accumulate `probable_modes` weighted by confidence.

3. **Compute final weight** — Per mode:
   ```
   base_weight = 1.0 + avg_triage_score * 7.0     (1.0 - 8.0 range)
   fp_boost = min(sum_fingerprint_probabilities, 2.0)  (0.0 - 2.0 range)
   final_weight = min(base_weight + fp_boost, 10.0)
   ```

4. **Apply** — Write to `ModeProgress.priority_weight`. Exhausted modes stay at 0.0.

5. **Cache** — Computed `mode_scores` and `narrowed_ranges` are cached to `TargetMetadataCache` for future queries.

## Priority Weight Effects

`work_service._get_weighted_mode_order()` reads priority weights:
- Modes sorted by `priority_weight DESC`
- Modes with weight 0.0 are skipped entirely
- Within same weight, finite modes are tried before infinite
- Workers get work from the highest-priority non-exhausted mode with available keyspace

## References

- [cost-model.md](references/cost-model.md)
