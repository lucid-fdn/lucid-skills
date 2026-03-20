# GPU Search Mode Reference

Complete reference for all 23 key search modes used by Before Quantum GPU workers.

## Mode List

| Mode | Name | Type | Key Generation Strategy |
|------|------|------|------------------------|
| 0 | Strong Random | Infinite | OS CSPRNG (baseline, unlikely vulnerable) |
| 1 | LCG glibc | Finite | glibc `rand()` — 32-bit state, ~4.3B keys |
| 2 | LCG MSVC | Finite | MSVC `rand()` — 15-bit output, ~32K effective |
| 3 | SHA256-seq | Infinite | SHA256(counter) — brain wallet numeric |
| 4 | Time-seeded glibc | Finite | glibc LCG seeded from Unix timestamp |
| 5 | MT19937 | Finite | Mersenne Twister 32-bit seed |
| 6 | Low-bits | Finite | Private key has weak low bits (entropy leak) |
| 7 | Repeated-pattern | Finite | Private key with repeating byte patterns |
| 8 | Time-seeded MSVC | Finite | MSVC LCG seeded from Unix timestamp |
| 9 | SHA256-decimal | Infinite | SHA256(decimal string of counter) |
| 10 | OpenSSL ≤0.9.8 | Finite | OpenSSL PRNG with PID-only entropy |
| 11 | SHA256-hex | Infinite | SHA256(hex string of counter) |
| 12 | Java SecureRandom LCG | Finite | Java LCG fallback (Android BitcoinJ) |
| 13 | Phone number | Finite | SHA256(phone number) — brain wallet |
| 14 | PHP mt_rand | Finite | PHP Mersenne Twister (web wallets) |
| 15 | Python random | Finite | Python MT19937 (scripts, bots) |
| 16 | Ruby rand | Finite | Ruby MT19937 variant |
| 17 | V8 MWC1616 | Finite | Chrome Math.random() pre-2015 (Randstorm) |
| 18 | V8 XorShift128+ | Finite | Chrome Math.random() 2015+ |
| 19 | Repeated-nibble | Finite | Low-entropy nibble patterns |
| 20 | Short-key | Finite | Private key < 128 bits effective |
| 21 | Short ASCII | Infinite | SHA256(ASCII strings length 1-8) |
| 22 | Timestamp-direct | Finite | Unix timestamp used directly as private key |

## Mode Categories

### Finite Modes (Exhaustible)
Modes 1, 2, 4, 5, 6, 7, 8, 10, 12, 14, 15, 16, 17, 18, 19, 20, 22

These have bounded keyspaces that will eventually be fully searched. Track progress via `ModeProgress.percent_complete`.

### Infinite Modes (Unbounded)
Modes 0, 3, 9, 11, 13, 21

These have effectively infinite keyspaces. Progress is measured by keys checked, not completion percentage.

### Temporal Modes (Timestamp-Seedable)
Modes 1, 2, 4, 5, 8, 12, 14, 15, 16, 18, 22

These use time-based seeds. If the target address's first on-chain appearance is known, the keyspace can be narrowed by ~300x to a 7-day window before that date.

### Brain Wallet Modes
Modes 3, 9, 11, 13, 21

These test `SHA256(passphrase)` patterns. Extended by the brain wallet candidate service for AI-generated passphrases.

## Worker Architecture

- Each worker runs on a single GPU (CUDA, HIP, or Metal)
- Workers request work units from the API server
- Each work unit specifies: mode, key range start/end, target hash list
- Workers report: keys checked, matches found, checkpoint data
- Heartbeat interval: configurable (default 30s)

## Throughput Benchmarks

| GPU | Approximate Speed |
|-----|-------------------|
| RTX 4090 | ~800M keys/sec |
| RTX 3090 | ~500M keys/sec |
| RX 7900 XTX | ~400M keys/sec |
| M2 Ultra | ~200M keys/sec |
