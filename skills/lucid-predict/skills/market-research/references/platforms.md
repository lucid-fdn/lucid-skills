# Platform API Reference

## Polymarket

- **API Base**: `https://gamma-api.polymarket.com`
- **Authentication**: None required (public read access)
- **Rate Limits**: 3 concurrent requests max, 300ms minimum between requests
- **Adapter**: `src/adapters/polymarket.ts`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/events` | Search and list prediction market events |
| `GET` | `/events?query={term}&limit={n}` | Search events by keyword |
| `GET` | `/markets/{id}` | Get a single market by ID |

### Response Mapping

| Polymarket Field | Unified Field |
|-----------------|---------------|
| `id` | `externalId` |
| `title` | `title` |
| `description` | `description` |
| `outcomes` | `outcomes` |
| `outcomePrices` | `currentPrices` |
| `volume` | `volumeUsd` |
| `liquidity` | `liquidityUsd` |
| `endDate` | `closeDate` |
| `active` (true) | `status` = `open` |
| `resolved` (true) | `status` = `resolved` |

---

## Manifold

- **API Base**: `https://api.manifold.markets/v0`
- **Authentication**: None required for read operations (API key optional for write)
- **Rate Limits**: 3 concurrent requests max, 200ms minimum between requests
- **Adapter**: `src/adapters/manifold.ts`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/search-markets?term={term}&limit={n}` | Search markets by keyword |
| `GET` | `/market/{id}` | Get a single market by ID/slug |
| `GET` | `/markets` | List markets (supports pagination) |

### Response Mapping

| Manifold Field | Unified Field |
|---------------|---------------|
| `id` | `externalId` |
| `question` | `title` |
| `description` | `description` |
| `answers` | `outcomes` |
| `probability` | `currentPrices` (binary: `{yes: probability, no: 1 - probability}`) |
| `volume` | `volumeUsd` |
| `totalLiquidity` | `liquidityUsd` |
| `closeTime` | `closeDate` (convert from Unix ms) |
| `isResolved` | `status` = `resolved` if true, `open` otherwise |

---

## Kalshi

- **API Base**: `https://api.elections.kalshi.com/trade-api/v2`
- **Authentication**: API key required (`PREDICT_KALSHI_API_KEY`)
- **Rate Limits**: 3 concurrent requests max, 500ms minimum between requests
- **Adapter**: `src/adapters/kalshi.ts`
- **Graceful degradation**: If no API key is provided, the adapter is not registered

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/markets` | List/search markets |
| `GET` | `/markets/{ticker}` | Get single market by ticker |
| `GET` | `/events` | List events containing markets |

### Response Mapping

| Kalshi Field | Unified Field |
|-------------|---------------|
| `ticker` | `externalId` |
| `title` | `title` |
| `subtitle` | `description` |
| `yes_bid` | `currentPrices.yes` (convert from cents) |
| `volume` | `volumeUsd` |
| `open_interest` | `liquidityUsd` |
| `close_time` | `closeDate` |

---

## Unified Market Data Model

All platform responses are normalized to the `Market` type in `src/types/index.ts`:

```typescript
interface Market {
  platform: PlatformId;        // 'polymarket' | 'manifold' | 'kalshi'
  externalId: string;          // Platform-specific identifier
  title: string;               // Market question
  description: string;         // Full description
  outcomes: Outcome[];         // [{label, price}]
  currentPrices: { yes: number; no: number };
  volumeUsd: number;
  liquidityUsd: number;
  closeDate?: string;          // ISO 8601
  status: 'open' | 'closed' | 'resolved' | 'disputed';
  url: string;
}
```

## Rate Limiting Strategy

All adapters use [Bottleneck](https://github.com/SGrondin/bottleneck) for rate limiting:

1. Per-platform concurrency limiter (max 3 concurrent requests)
2. Minimum delay between requests (Polymarket: 300ms, Manifold: 200ms, Kalshi: 500ms)
3. Adapters queried in parallel, but per-platform limits respected independently
4. Failed adapters log a warning and are skipped (graceful degradation)
