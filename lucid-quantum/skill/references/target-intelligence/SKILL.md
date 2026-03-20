---
name: target-intelligence
description: "Target address classification, vulnerability scoring, and temporal narrowing for optimized search"
version: 1.0.0
---

# Target Intelligence

Classify Bitcoin target addresses by vulnerability probability, compute temporal narrowing for 300x speedup on timestamp-seeded modes, and aggregate intelligence for automated priority optimization.

## Procedure

1. **Classify targets** — Call `quantum_triage` to compute per-mode vulnerability scores for all targets
2. **Narrow search ranges** — For targets with `first_seen_timestamp`, call `quantum_narrow` to constrain timestamp modes to a 7-day window (300x reduction)
3. **Apply intelligence** — Call `quantum_optimize` to aggregate triage + fingerprint data into mode priority weights

## Triage Scoring Algorithm

For each target, the system computes a probability distribution across all 23 modes:

1. **Base probability** — Inversely proportional to keyspace size:
   - Keyspace <= 100K: 15% base (modes 10, 20)
   - Keyspace <= 100M: 8% base (modes 1, 2, 4, 5, etc.)
   - Keyspace >= 2^64: 0.1% base (modes 3, 6, 7, 9, 11)

2. **Temporal boost** — If `first_seen_timestamp` is in the Bitcoin early era (2009-2011), timestamp-seeded modes get 2.5x boost

3. **Early Bitcoin boost** — First year (2009): low-bit keys (mode 6) get 3x, OpenSSL modes get 2x

4. **Coinbase penalty** — Miner rewards reduce brain wallet probability by 90%

5. **Script type boost** — P2PKH addresses from early era get 1.3x on timestamp modes

6. **Normalization** — All scores normalized to sum=1 (probability distribution)

## Temporal Narrowing

Key insight: private keys were generated BEFORE their first on-chain transaction.

- 90% of keys appear within 24 hours of generation
- 99% appear within 7 days
- Window: `[first_seen - 7 days, first_seen]`

For a target first seen at timestamp `T`:
- Mode 1 (time-lcg-glibc): search `[T-604800-GENESIS, T-GENESIS]` instead of full `[0, 62833495]`
- Mode 12 (java-lcg): multiply by 1000 for millisecond modes
- Mode 8 (time-lcg-pid): multiply by 32768 for PID-combined modes

## References

- [triage-algorithm.md](references/triage-algorithm.md)
