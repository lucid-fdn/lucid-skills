# Brain Wallet Strategy Patterns

Reference for passphrase generation strategies used by the brain wallet candidate service.

## Strategy Performance Benchmarks

Historical hit rates for different strategy approaches:

| Strategy Tag | Candidates/batch | Typical Hit Rate | Notes |
|-------------|-----------------|------------------|-------|
| `dictionary-en-v1` | 10,000 | ~0.001% | Single English words exhausted early |
| `rockyou-top10k` | 10,000 | ~0.005% | Known leaked passwords |
| `date-combinations` | 50,000 | ~0.0001% | `YYYY-MM-DD`, `MM/DD/YYYY` variants |
| `btc-related-phrases` | 5,000 | ~0.01% | "satoshi", "bitcoin", "nakamoto" + variants |
| `markov-chain-en` | 100,000 | ~0.0005% | Statistically plausible English |
| `gpt4-wordlist-v2` | 50,000 | ~0.002% | AI-generated likely passphrases |
| `multilingual-common` | 20,000 | ~0.001% | Cross-language common words |

## Strategy Design Principles

### 1. Coverage vs. Depth
- **Broad strategies** (dictionary, multilingual): Large candidate space, low per-candidate probability
- **Deep strategies** (btc-related, AI-generated): Small candidate space, higher per-candidate probability
- **Optimal mix**: 70% deep / 30% broad

### 2. Passphrase Transformations

For each base passphrase, generate variants:

| Transform | Example | Multiplier |
|-----------|---------|------------|
| Lowercase | `bitcoin` | 1x |
| Title case | `Bitcoin` | 1x |
| UPPER case | `BITCOIN` | 1x |
| Leet speak | `b1tc01n` | 2-3x |
| With year suffix | `bitcoin2011` | 10x |
| With special char | `bitcoin!` | 5x |
| Reversed | `nioctib` | 1x |
| Doubled | `bitcoinbitcoin` | 1x |

### 3. Compound Strategies

Combine base words:
- 2-word: `word1 word2` (space-separated)
- 2-word: `word1word2` (concatenated)
- 3-word: `word1 word2 word3`
- With numbers: `word1 123 word2`

## GPU-Side Brain Wallet Modes

These modes run on GPU workers directly (not through the candidate service):

| Mode | Pattern | Speed | Notes |
|------|---------|-------|-------|
| 3 | SHA256(counter) | Very fast | Sequential numbers as "passphrases" |
| 9 | SHA256(decimal string) | Fast | "1", "2", ..., "999999999" |
| 11 | SHA256(hex string) | Fast | "0x1", "0x2", ... |
| 13 | SHA256(phone number) | Fast | All 10-digit combinations |
| 21 | SHA256(ASCII 1-8 chars) | Medium | All printable ASCII strings up to 8 chars |

## Candidate Submission API

```
POST /api/brain/candidates
Headers: X-Admin-Secret: <secret>
Body: {
  "strategy_tag": "btc-related-phrases",
  "candidates": ["satoshi nakamoto", "bitcoin genesis", ...],
  "priority": 1
}
```

Response includes `batch_id` for tracking.

## Evolution Strategy

Weekly review process:
1. Query all strategy hit rates via `quantum_brain`
2. **Scale up**: Strategies with hit_rate > 2x average → double batch size
3. **Retire**: Strategies with 0 hits after 500K+ candidates → pause
4. **Mutate**: Generate new strategies by combining transforms from winning strategies
5. **Introduce**: Add 1-2 experimental strategies per cycle
