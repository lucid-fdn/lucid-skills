---
name: brain-wallet
description: "Brain wallet passphrase strategy management: batch submission, performance tracking, and strategy evolution"
version: 1.0.0
---

# Brain Wallet

Manage brain wallet passphrase candidate strategies. Brain wallets use `SHA256(passphrase)` as the private key — if the passphrase is guessable, the key is crackable.

## Procedure

1. **Review strategies** — Call `quantum_brain` to see hit rates per strategy tag
2. **Submit candidates** — Use the BQ API `bq_submit_candidates` tool with a strategy tag and candidate list
3. **Track batches** — Monitor batch completion and hit rates
4. **Evolve** — Scale up winning strategies, retire losers

## Strategy Tags

Strategy tags identify the generation approach:
- `dictionary-en-v1` — English dictionary words
- `rockyou-top10k` — Top passwords from RockYou leak
- `date-combinations` — Date strings (2009-2011)
- `btc-related-phrases` — Bitcoin-themed phrases ("satoshi", "bitcoin", etc.)
- `markov-chain-en` — Markov chain generated passphrases
- `gpt4-wordlist-v2` — AI-generated likely passphrases
- `multilingual-common` — Common words across languages

## Existing Brain Wallet Modes (GPU-side)

The GPU workers already test these brain wallet patterns:
- Mode 3: SHA256(sequential counter)
- Mode 9: SHA256(decimal string of counter)
- Mode 11: SHA256(hex string of counter)
- Mode 13: SHA256(phone number)
- Mode 21: SHA256(short ASCII strings, length 1-8)

The brain wallet service extends this with AI-generated candidate passphrases that go beyond systematic enumeration.

## References

- [strategy-patterns.md](references/strategy-patterns.md)
