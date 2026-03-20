# Wallet Signature Reference

Transaction-level features used to fingerprint wallet software versions.

## Feature Extraction

### 1. nLockTime (Weight: 0.30)

| Value | Interpretation | Wallet Era |
|-------|---------------|------------|
| `0x00000000` | No lock time (default pre-0.8) | Bitcoin-Qt 0.1–0.7, early Electrum |
| `block_height` | Anti-fee-sniping (0.8+) | Bitcoin Core 0.8+, modern wallets |
| `0xFFFFFFFE` | RBF signaling | Modern wallets (2016+) |

### 2. Output Ordering (Weight: 0.25)

| Pattern | Interpretation | Wallet |
|---------|---------------|--------|
| `fixed` | Outputs in deterministic order (amount ASC) | Bitcoin-Qt 0.1–0.5 |
| `random` | Outputs in random order | Bitcoin Core 0.6+, Blockchain.info |
| `bip69` | Lexicographic ordering (BIP 69) | Electrum, BitcoinJ, modern wallets |

### 3. Transaction Version (Weight: 0.20)

| Version | Interpretation |
|---------|---------------|
| `1` | Pre-BIP68 (before ~2016) |
| `2` | Post-BIP68, supports relative lock time |

### 4. Sequence Number (Weight: 0.15)

| Value | Interpretation |
|-------|---------------|
| `0xFFFFFFFF` | Final (no RBF), standard for early wallets |
| `0xFFFFFFFD` | RBF opt-in (BIP 125) |
| `0xFFFFFFFE` | nLockTime-enabled but not RBF |
| Other | Custom sequence, unusual |

### 5. Fee Rate (Weight: 0.10)

| Range (sat/vB) | Interpretation |
|----------------|---------------|
| < 1 | Very early (pre-fee market, 2009-2012) |
| 1-5 | Early fee market (2012-2015) |
| 5-50 | Standard (2015-2020) |
| 50+ | High congestion or modern |

## Known Wallet Signatures

### Bitcoin-Qt / Bitcoin Core

| Version | nLockTime | Output Order | tx_version | Sequence | Probable Modes |
|---------|-----------|-------------|------------|----------|----------------|
| 0.1–0.3 (2009) | zero | fixed | 1 | ffffffff | 1, 2, 6, 10 |
| 0.3–0.5 (2010) | zero | fixed | 1 | ffffffff | 1, 2, 5, 10 |
| 0.5–0.7 (2011) | zero | fixed/random | 1 | ffffffff | 5, 1, 2 |
| 0.8+ (2013) | block_height | random | 1→2 | varies | 0 (strong) |

### Electrum

| Version | nLockTime | Output Order | Probable Modes |
|---------|-----------|-------------|----------------|
| 1.x (2011-2013) | zero | bip69 | 5, 3 |
| 2.x (2014+) | block_height | bip69 | 0 (strong) |

### Blockchain.info Web Wallet

| Era | nLockTime | Output Order | Probable Modes |
|-----|-----------|-------------|----------------|
| 2011-2013 | zero | random | 17, 18 |
| 2014+ | zero | random | 18, 0 |

### BitcoinJ (Android)

| Version | nLockTime | Output Order | Probable Modes |
|---------|-----------|-------------|----------------|
| 0.x (2011-2013) | zero | bip69 | 12 |
| 0.14+ | block_height | bip69 | 0 (strong) |

### Web Wallets (JavaScript)

| Platform | Engine | PRNG | Mode |
|----------|--------|------|------|
| Chrome pre-2015 | V8 MWC1616 | `Math.random()` | 17 |
| Chrome 2015+ | V8 XorShift128+ | `Math.random()` | 18 |
| Firefox | SpiderMonkey | `Math.random()` | Not modeled |
| IE/Edge Legacy | Chakra | `Math.random()` | Not modeled |

## Confidence Scoring

Fingerprint confidence = weighted sum of feature matches:

```
confidence = Σ(feature_weight × match_score)

where match_score:
  1.0 = exact match to known signature
  0.5 = partial match (e.g., correct era but wrong order)
  0.0 = no match or contradictory
```

Minimum confidence threshold for mode recommendations: **0.3** (30%)

## Randstorm Vulnerability (CVE-2023-40893)

Affects JavaScript wallets using `Math.random()` in Chrome V8 engine:
- **MWC1616** (pre-2015): 64-bit internal state → feasible to brute force
- **XorShift128+**: 128-bit state → harder but partially predictable from outputs
- Affected platforms: Blockchain.info, BitGo, early web wallets
- Estimated affected addresses: ~5.7M (per Unciphered research)
- BQ Mode 17 specifically targets MWC1616 Randstorm
