---
name: research
description: "Wallet fingerprinting, address clustering, and vulnerability research for target address intelligence"
version: 1.0.0
---

# Research

Advanced intelligence features for identifying wallet software, clustering related addresses, and tracking vulnerability research.

## Wallet Fingerprinting

Identify wallet software from transaction patterns. Each wallet version has distinctive behaviors:

| Feature | Weight | Values |
|---------|--------|--------|
| nLockTime | 0.30 | `zero` (pre-0.8), `block_height` (0.8+) |
| Output ordering | 0.25 | `fixed` (early Qt), `random` (modern), `bip69` (Electrum) |
| tx_version | 0.20 | `1` (pre-BIP68), `2` (post-BIP68) |
| Sequence | 0.15 | `ffffffff` (no RBF), other (RBF-enabled) |
| Fee rate | 0.10 | < 5 sat/vB suggests early wallet (pre-fee market) |

### Known Wallet Signatures

| Wallet | nLockTime | Output | Probable Modes |
|--------|-----------|--------|----------------|
| Bitcoin-Qt 0.1-0.3 | zero | fixed | 1 (LCG glibc), 2 (LCG MSVC), 6 (low-bits), 10 (OpenSSL) |
| Bitcoin-Qt 0.3-0.7 | zero | fixed | 5 (MT19937), 1, 2 |
| Bitcoin-Qt 0.8+ | block_height | random | 0 (strong random) — unlikely vulnerable |
| Electrum 1.x | zero | bip69 | 5 (MT19937), 3 (SHA256-seq) |
| Blockchain.info 2011-2013 | zero | random | 17 (V8 MWC1616 Randstorm), 18 (V8 XorShift128+) |
| Android BitcoinJ | zero | bip69 | 12 (Java LCG) |

## Procedure

1. **Fingerprint a target** — Call `quantum_fingerprint` with Hash160 and observed tx patterns
2. **List fingerprints** — View accumulated fingerprint database
3. **Apply to optimization** — `quantum_optimize` automatically incorporates fingerprint `probable_modes`

## References

- [wallet-signatures.md](references/wallet-signatures.md)
