---
name: fleet-management
description: "GPU fleet orchestration: worker registration, health monitoring, throughput tracking, and mode scheduling"
version: 1.0.0
---

# Fleet Management

Manage a distributed fleet of GPU workers (NVIDIA CUDA, Apple Metal, AMD HIP) performing Bitcoin private key search across 23 weak entropy modes.

## Procedure

1. **Assess fleet status** — Call `quantum_fleet` to get active/offline workers, total throughput, and modes needing attention
2. **Check health** — Call `quantum_protect` for comprehensive health checks (worker connectivity, throughput, mode stalls)
3. **Optimize priorities** — If modes need rebalancing, call `quantum_optimize` to auto-adjust priority weights
4. **Monitor costs** — Call `quantum_cost` to identify inefficient modes consuming disproportionate GPU time
5. **Review progress** — Call `quantum_review` for overall fleet performance summary

## Key Concepts

| Concept | Description |
|---------|-------------|
| Worker | A GPU process running btc_puzzle with `--worker` flag, connected to the API |
| Mode | One of 23 weak key generation strategies (LCG, MT19937, SHA256-brain, etc.) |
| Priority Weight | 0.0-10.0 float controlling work distribution per mode (0 = disabled) |
| Work Unit | A keyspace range (mode + start_offset + end_offset) assigned to a worker |
| Checkpoint | A verifiable sample point within a work unit for anti-cheat validation |
| Canary | A honeypot target with a known private key, injected to detect cheating |

## Mode Reference

| Mode | Name | Keyspace | Strategy |
|------|------|----------|----------|
| 0 | random | Infinite | Strong random (cuRAND) |
| 1 | time-lcg-glibc | ~63M | glibc LCG seeded by Unix timestamp |
| 2 | time-lcg-msvc | ~63M | MSVC LCG seeded by Unix timestamp |
| 3 | sha256-seq | 2^64 | SHA256(counter) |
| 4 | sha256-time | ~63M | SHA256(timestamp) |
| 5 | time-mt | ~63M | MT19937 seeded by timestamp |
| 6 | low-bits | 2^64 | key = counter (small keys) |
| 10 | openssl-pid | 65,536 | OpenSSL seeded by PID only |
| 12 | java-lcg | ~63B | Java LCG with ms timestamps |
| 13 | phone-sha256 | 10B | SHA256(phone_number) |
| 17 | v8-mwc1616 | ~4T | V8 JavaScript MWC1616 (Randstorm) |
| 20 | openssl-debian | 65,536 | Debian OpenSSL CVE-2008-0166 |
| 21 | sha256-short-ascii | ~744B | SHA256(short strings, len 1-8) |

## References

- [modes.md](references/modes.md)
