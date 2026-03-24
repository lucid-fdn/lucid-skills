# Lucid Predict v5 — Edge Hunter Brain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform lucid-predict from pure markdown (v4) to a TypeScript MCP server with 7 brain tools focused on systematic edge detection in prediction markets.

**Architecture:** Brain-first approach — adapters, intelligence (math), and brain layer built together. 3 platform adapters (Polymarket, Manifold, Kalshi) feeding into 9 pure math modules, orchestrated by 7 brain tools that return structured JSON (same pattern as lucid-trade).

**Tech Stack:** TypeScript 5.8, Vitest, tsup, MCP SDK, Zod, Bottleneck (rate limiting)

**Working directory:** `C:\lucid-plugins\skills\lucid-predict`

**Reference implementation:** `C:\lucid-plugins\skills\lucid-trade` (mirror all patterns)

**Design doc:** `C:\lucid-plugins\docs\plans\2026-02-26-lucid-predict-brain-design.md`

---

## Task 1: Foundation Scaffold

**Files:**
- Create: `src/plugin-id.ts`
- Create: `src/config.ts`
- Create: `src/types/index.ts`
- Create: `src/utils/logger.ts`
- Create: `src/tools/index.ts` (ToolDefinition type)
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `tsup.config.ts`
- Modify: `package.json` (upgrade to v5 with TypeScript deps)

**Step 1: Update package.json to v5 TypeScript**

```json
{
  "name": "@raijinlabs/predict",
  "version": "5.0.0",
  "description": "Lucid Predict — Prediction market edge detection: EV analysis, Kelly sizing, cross-platform arbitrage, calibration tracking",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "bin": {
    "predict-mcp": "dist/bin.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "prettier --check .",
    "format": "prettier --write ."
  },
  "keywords": [
    "prediction-market", "polymarket", "manifold", "kalshi",
    "kelly-criterion", "expected-value", "arbitrage", "mcp",
    "forecasting", "calibration"
  ],
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "bottleneck": "^2.19.5",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@types/node": "^22.15.21",
    "prettier": "^3.5.3",
    "tsup": "^8.4.0",
    "typescript": "^5.8.3",
    "vitest": "^3.1.3"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/bin.ts', 'src/index.ts', 'src/openclaw.ts'],
    },
    testTimeout: 10000,
  },
});
```

**Step 4: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    mcp: 'src/mcp.ts',
    openclaw: 'src/openclaw.ts',
    bin: 'src/bin.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  shims: true,
  banner: ({ format }) => {
    if (format === 'cjs') {
      return { js: '#!/usr/bin/env node' };
    }
    return {};
  },
});
```

**Step 5: Create src/plugin-id.ts**

```typescript
// ---------------------------------------------------------------------------
// plugin-id.ts -- Plugin identity constants
// ---------------------------------------------------------------------------

export const PLUGIN_ID = 'lucid-predict' as const;
export const PLUGIN_NAME = 'Lucid Predict' as const;
export const PLUGIN_VERSION = '5.0.0' as const;
export const PLUGIN_DESCRIPTION =
  'Edge Hunter — 7 smart prediction market tools powered by Bayesian analysis, Kelly sizing, and cross-platform arbitrage. Find the edge, size the bet.' as const;
```

**Step 6: Create src/utils/logger.ts**

Mirror trade's logger exactly but with `[predict]` prefix and `PREDICT_LOG_LEVEL` env var:

```typescript
// ---------------------------------------------------------------------------
// utils/logger.ts -- Simple structured logger (writes to stderr)
// ---------------------------------------------------------------------------

const PREFIX = '[predict]';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
};

let currentLevel: LogLevel = (process.env.PREDICT_LOG_LEVEL as LogLevel) ?? 'info';

function shouldLog(level: LogLevel): boolean {
  return (LOG_LEVELS[level] ?? 1) >= (LOG_LEVELS[currentLevel] ?? 1);
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${PREFIX} [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const log = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('debug')) process.stderr.write(formatMessage('debug', message, meta) + '\n');
  },
  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('info')) process.stderr.write(formatMessage('info', message, meta) + '\n');
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('warn')) process.stderr.write(formatMessage('warn', message, meta) + '\n');
  },
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    if (shouldLog('error')) {
      const errMeta = error instanceof Error
        ? { ...meta, errorMessage: error.message, stack: error.stack }
        : { ...meta, error };
      process.stderr.write(formatMessage('error', message, errMeta) + '\n');
    }
  },
  setLevel(level: LogLevel): void { currentLevel = level; },
  getLevel(): LogLevel { return currentLevel; },
};
```

**Step 7: Create src/types/index.ts**

```typescript
// ---------------------------------------------------------------------------
// types/index.ts -- Core type definitions for Lucid Predict
// ---------------------------------------------------------------------------

/** Supported prediction market platforms */
export type PlatformId = 'polymarket' | 'manifold' | 'kalshi';

/** Market resolution types */
export type ResolutionType = 'binary' | 'multiple_choice' | 'scalar';

/** Market statuses */
export type MarketStatus = 'open' | 'closed' | 'resolved' | 'disputed';

/** Market categories */
export type MarketCategory =
  | 'politics' | 'crypto' | 'sports' | 'science'
  | 'economics' | 'technology' | 'entertainment'
  | 'world_events' | 'other';

/** A single outcome in a market */
export interface Outcome {
  label: string;
  price: number; // 0-1
}

/** Unified prediction market model (normalized across all platforms) */
export interface Market {
  platform: PlatformId;
  externalId: string;
  title: string;
  description: string;
  category: MarketCategory;
  resolutionType: ResolutionType;
  outcomes: Outcome[];
  currentPrices: { yes: number; no: number };
  volumeUsd: number;
  liquidityUsd: number;
  closeDate: string; // ISO 8601
  status: MarketStatus;
  url: string;
}

/** Historical price point */
export interface PricePoint {
  timestamp: number;
  price: number;
}

/** A resolved market with outcome info */
export interface ResolvedMarket extends Market {
  resolvedOutcome: string;
  resolvedAt: string; // ISO 8601
}

/** Matched market pair (for arbitrage/correlation) */
export interface MatchedPair {
  marketA: Market;
  marketB: Market;
  similarity: number; // 0-1 title similarity
}

/** Odds format for conversion */
export type OddsFormat = 'probability' | 'decimal' | 'american' | 'fractional';

/** A forecast for calibration tracking */
export interface Forecast {
  predictedProbability: number;
  actualOutcome: 0 | 1;
  category?: string;
}
```

**Step 8: Create src/tools/index.ts**

```typescript
// ---------------------------------------------------------------------------
// tools/index.ts -- Tool type definitions for Lucid Predict MCP
// ---------------------------------------------------------------------------

export type ParamType = 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';

export interface ToolParamDef {
  type: ParamType;
  required?: boolean;
  description?: string;
  values?: string[];
  min?: number;
  max?: number;
  default?: unknown;
  properties?: Record<string, ToolParamDef>;
  items?: ToolParamDef;
}

export interface ToolDefinition<T = any> {
  name: string;
  description: string;
  params: Record<string, ToolParamDef>;
  execute: (params: T) => Promise<string>;
}
```

**Step 9: Create src/config.ts**

```typescript
// ---------------------------------------------------------------------------
// config.ts -- Configuration loader (Zod schema)
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const ConfigSchema = z.object({
  // -- Platform credentials (all optional) ------------------------------------
  polymarketApiUrl: z.string().url().default('https://gamma-api.polymarket.com'),
  manifoldApiUrl: z.string().url().default('https://api.manifold.markets/v0'),
  kalshiApiUrl: z.string().url().default('https://api.elections.kalshi.com/trade-api/v2'),
  kalshiApiKey: z.string().optional(),
  kalshiEmail: z.string().optional(),
  kalshiPassword: z.string().optional(),

  // -- Defaults ---------------------------------------------------------------
  defaultBankroll: z.coerce.number().default(10_000),
  defaultMaxFraction: z.coerce.number().default(0.25),
  minSpreadPct: z.coerce.number().default(3),

  // -- General settings -------------------------------------------------------
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type PluginConfig = z.infer<typeof ConfigSchema>;

/**
 * Load configuration from environment variables.
 *
 * Env var naming convention:
 *   PREDICT_POLYMARKET_API_URL, PREDICT_MANIFOLD_API_URL
 *   PREDICT_KALSHI_API_KEY, PREDICT_KALSHI_EMAIL, PREDICT_KALSHI_PASSWORD
 *   PREDICT_DEFAULT_BANKROLL, PREDICT_DEFAULT_MAX_FRACTION
 *   PREDICT_MIN_SPREAD_PCT, PREDICT_LOG_LEVEL
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): PluginConfig {
  return ConfigSchema.parse({
    polymarketApiUrl: env.PREDICT_POLYMARKET_API_URL,
    manifoldApiUrl: env.PREDICT_MANIFOLD_API_URL,
    kalshiApiUrl: env.PREDICT_KALSHI_API_URL,
    kalshiApiKey: env.PREDICT_KALSHI_API_KEY,
    kalshiEmail: env.PREDICT_KALSHI_EMAIL,
    kalshiPassword: env.PREDICT_KALSHI_PASSWORD,
    defaultBankroll: env.PREDICT_DEFAULT_BANKROLL,
    defaultMaxFraction: env.PREDICT_DEFAULT_MAX_FRACTION,
    minSpreadPct: env.PREDICT_MIN_SPREAD_PCT,
    logLevel: env.PREDICT_LOG_LEVEL,
  });
}
```

**Step 10: Install dependencies and verify**

Run: `cd /c/lucid-plugins/skills/lucid-predict && npm install`
Run: `npx tsc --noEmit`
Expected: Clean compile (no errors)

**Step 11: Commit**

```bash
git add -A src/ tsconfig.json vitest.config.ts tsup.config.ts package.json
git commit -m "feat(predict): v5 foundation scaffold — TypeScript, types, config, logger"
```

---

## Task 2: Math Layer — EV, Kelly, Odds (Core Trio)

The 3 most important math functions. All pure, synchronous, fully tested.

**Files:**
- Create: `src/math/ev.ts` + `src/math/ev.test.ts`
- Create: `src/math/kelly.ts` + `src/math/kelly.test.ts`
- Create: `src/math/odds.ts` + `src/math/odds.test.ts`
- Create: `src/math/index.ts`

### ev.ts — Expected Value Calculator

```typescript
// ---------------------------------------------------------------------------
// math/ev.ts -- Expected value calculator for prediction markets
// ---------------------------------------------------------------------------

export interface EvResult {
  payout: number;
  expectedPayout: number;
  ev: number;
  roiPct: number;
  edgePct: number;
  isPositiveEv: boolean;
}

/**
 * Calculate expected value for a prediction market position.
 *
 * @param stake       Amount you're betting
 * @param price       Market price (0-1, e.g. 0.40 = 40 cents)
 * @param probability Your estimated true probability (0-1)
 */
export function expectedValue(stake: number, price: number, probability: number): EvResult {
  if (price <= 0 || price >= 1) {
    return { payout: 0, expectedPayout: 0, ev: 0, roiPct: 0, edgePct: 0, isPositiveEv: false };
  }
  const payout = stake / price;
  const expectedPayout = probability * payout;
  const ev = expectedPayout - stake;
  const roiPct = stake > 0 ? (ev / stake) * 100 : 0;
  const edgePct = (probability - price) * 100;
  return { payout, expectedPayout, ev, roiPct, edgePct, isPositiveEv: ev > 0 };
}
```

### ev.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { expectedValue } from './ev.js';

describe('expectedValue', () => {
  it('calculates positive EV with 15% edge', () => {
    // Stake $100, market at 0.40, true prob 0.55
    const r = expectedValue(100, 0.40, 0.55);
    expect(r.payout).toBeCloseTo(250, 1);
    expect(r.expectedPayout).toBeCloseTo(137.5, 1);
    expect(r.ev).toBeCloseTo(37.5, 1);
    expect(r.roiPct).toBeCloseTo(37.5, 1);
    expect(r.edgePct).toBeCloseTo(15, 1);
    expect(r.isPositiveEv).toBe(true);
  });

  it('returns negative EV when market is correct', () => {
    const r = expectedValue(100, 0.60, 0.55);
    expect(r.ev).toBeLessThan(0);
    expect(r.isPositiveEv).toBe(false);
  });

  it('returns zero EV when estimate equals price', () => {
    const r = expectedValue(100, 0.50, 0.50);
    expect(r.ev).toBeCloseTo(0, 5);
    expect(r.edgePct).toBeCloseTo(0, 5);
  });

  it('handles edge case of price at boundary', () => {
    const r0 = expectedValue(100, 0, 0.5);
    expect(r0.ev).toBe(0);
    const r1 = expectedValue(100, 1, 0.5);
    expect(r1.ev).toBe(0);
  });

  it('handles zero stake', () => {
    const r = expectedValue(0, 0.40, 0.55);
    expect(r.ev).toBe(0);
    expect(r.roiPct).toBe(0);
  });
});
```

### kelly.ts — Kelly Criterion

```typescript
// ---------------------------------------------------------------------------
// math/kelly.ts -- Kelly criterion position sizing for prediction markets
// ---------------------------------------------------------------------------

export interface KellyResult {
  fullKelly: number;
  halfKelly: number;
  recommended: number;
  positionSize: number;
  shouldBet: boolean;
}

/**
 * Kelly criterion: optimal fraction of bankroll to wager.
 *
 * f* = (b * p - q) / b
 * where b = net odds = (1/price) - 1, p = prob, q = 1-p
 *
 * @param price        Market price (0-1)
 * @param probability  Your estimated true probability (0-1)
 * @param bankroll     Total bankroll
 * @param maxFraction  Maximum fraction to bet (default 0.25)
 */
export function kellyFraction(
  price: number,
  probability: number,
  bankroll: number,
  maxFraction: number = 0.25,
): KellyResult {
  if (price <= 0 || price >= 1 || probability <= 0 || probability >= 1 || bankroll <= 0) {
    return { fullKelly: 0, halfKelly: 0, recommended: 0, positionSize: 0, shouldBet: false };
  }

  const b = (1 / price) - 1; // net odds
  const p = probability;
  const q = 1 - p;
  const fStar = Math.max(0, (b * p - q) / b);

  const halfK = fStar / 2;
  const recommended = Math.min(halfK, maxFraction);
  const positionSize = bankroll * recommended;

  return {
    fullKelly: round(fStar, 4),
    halfKelly: round(halfK, 4),
    recommended: round(recommended, 4),
    positionSize: round(positionSize, 2),
    shouldBet: fStar > 0,
  };
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
```

### kelly.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { kellyFraction } from './kelly.js';

describe('kellyFraction', () => {
  it('computes correct Kelly for 15% edge example', () => {
    // price=0.40, prob=0.55, bankroll=$10k
    const r = kellyFraction(0.40, 0.55, 10_000);
    expect(r.fullKelly).toBeCloseTo(0.25, 2);
    expect(r.halfKelly).toBeCloseTo(0.125, 2);
    expect(r.recommended).toBeCloseTo(0.125, 2);
    expect(r.positionSize).toBeCloseTo(1250, 0);
    expect(r.shouldBet).toBe(true);
  });

  it('returns zero for no edge (price == probability)', () => {
    const r = kellyFraction(0.50, 0.50, 10_000);
    expect(r.fullKelly).toBe(0);
    expect(r.shouldBet).toBe(false);
  });

  it('returns zero for negative edge', () => {
    const r = kellyFraction(0.60, 0.50, 10_000);
    expect(r.fullKelly).toBe(0);
    expect(r.shouldBet).toBe(false);
  });

  it('caps at maxFraction', () => {
    // Very high edge: price=0.10, prob=0.90
    const r = kellyFraction(0.10, 0.90, 10_000, 0.25);
    expect(r.recommended).toBeLessThanOrEqual(0.25);
  });

  it('handles boundary prices', () => {
    expect(kellyFraction(0, 0.5, 10_000).shouldBet).toBe(false);
    expect(kellyFraction(1, 0.5, 10_000).shouldBet).toBe(false);
  });

  it('handles zero bankroll', () => {
    expect(kellyFraction(0.40, 0.55, 0).positionSize).toBe(0);
  });

  it('uses half-Kelly for conservative sizing by default', () => {
    const r = kellyFraction(0.30, 0.50, 10_000);
    expect(r.recommended).toBe(r.halfKelly);
  });
});
```

### odds.ts — Odds Conversion

```typescript
// ---------------------------------------------------------------------------
// math/odds.ts -- Odds format conversion for prediction markets
// ---------------------------------------------------------------------------

import type { OddsFormat } from '../types/index.js';

/**
 * Convert odds between formats.
 * Supported: probability (0-1), decimal (1.0+), american (+/-), fractional (numerator only, denom=1)
 */
export function convertOdds(value: number, from: OddsFormat, to: OddsFormat): number {
  if (from === to) return value;

  // Step 1: convert to probability
  let prob: number;
  switch (from) {
    case 'probability':
      prob = value;
      break;
    case 'decimal':
      prob = value > 0 ? 1 / value : 0;
      break;
    case 'american':
      if (value > 0) prob = 100 / (value + 100);
      else if (value < 0) prob = Math.abs(value) / (Math.abs(value) + 100);
      else prob = 0;
      break;
    case 'fractional':
      prob = 1 / (value + 1);
      break;
    default:
      prob = 0;
  }

  // Step 2: convert probability to target
  if (prob <= 0 || prob >= 1) {
    // Edge cases: return sensible defaults
    if (to === 'probability') return Math.max(0, Math.min(1, prob));
    if (to === 'decimal') return prob <= 0 ? Infinity : 1;
    return 0;
  }

  switch (to) {
    case 'probability':
      return round(prob, 4);
    case 'decimal':
      return round(1 / prob, 4);
    case 'american':
      const decimal = 1 / prob;
      if (decimal >= 2.0) return round((decimal - 1) * 100, 1);
      else return round(-100 / (decimal - 1), 1);
    case 'fractional':
      return round((1 / prob) - 1, 4);
    default:
      return 0;
  }
}

/** Price IS implied probability in binary prediction markets. */
export function impliedProbability(price: number): number {
  return Math.max(0, Math.min(1, price));
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
```

### odds.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { convertOdds, impliedProbability } from './odds.js';

describe('convertOdds', () => {
  it('converts probability to decimal', () => {
    expect(convertOdds(0.60, 'probability', 'decimal')).toBeCloseTo(1.667, 2);
  });

  it('converts decimal to probability', () => {
    expect(convertOdds(2.50, 'decimal', 'probability')).toBeCloseTo(0.40, 2);
  });

  it('converts decimal to positive american', () => {
    expect(convertOdds(2.50, 'decimal', 'american')).toBeCloseTo(150, 0);
  });

  it('converts decimal to negative american', () => {
    expect(convertOdds(1.50, 'decimal', 'american')).toBeCloseTo(-200, 0);
  });

  it('converts positive american to decimal', () => {
    expect(convertOdds(150, 'american', 'decimal')).toBeCloseTo(2.50, 2);
  });

  it('converts negative american to decimal', () => {
    expect(convertOdds(-200, 'american', 'decimal')).toBeCloseTo(1.50, 2);
  });

  it('converts fractional to decimal', () => {
    // 3/1 fractional = 4.0 decimal
    expect(convertOdds(3, 'fractional', 'decimal')).toBeCloseTo(4.0, 2);
  });

  it('returns same value for identity conversion', () => {
    expect(convertOdds(0.55, 'probability', 'probability')).toBe(0.55);
  });
});

describe('impliedProbability', () => {
  it('returns price as probability', () => {
    expect(impliedProbability(0.65)).toBe(0.65);
  });

  it('clamps to 0-1', () => {
    expect(impliedProbability(-0.1)).toBe(0);
    expect(impliedProbability(1.5)).toBe(1);
  });
});
```

### math/index.ts

```typescript
// ---------------------------------------------------------------------------
// math/index.ts -- Barrel export for all math functions
// ---------------------------------------------------------------------------

export { expectedValue } from './ev.js';
export type { EvResult } from './ev.js';
export { kellyFraction } from './kelly.js';
export type { KellyResult } from './kelly.js';
export { convertOdds, impliedProbability } from './odds.js';
```

**Step: Run tests**

Run: `cd /c/lucid-plugins/skills/lucid-predict && npx vitest run`
Expected: All tests pass

**Step: Type check**

Run: `npx tsc --noEmit`
Expected: Clean

**Step: Commit**

```bash
git add src/math/
git commit -m "feat(predict): math core — EV calculator, Kelly criterion, odds conversion"
```

---

## Task 3: Math Layer — Efficiency, Liquidity, Time Value

**Files:**
- Create: `src/math/efficiency.ts` + `src/math/efficiency.test.ts`
- Create: `src/math/liquidity.ts` + `src/math/liquidity.test.ts`
- Create: `src/math/time-value.ts` + `src/math/time-value.test.ts`
- Modify: `src/math/index.ts` (add exports)

### efficiency.ts — Market Efficiency Analysis

```typescript
// ---------------------------------------------------------------------------
// math/efficiency.ts -- Market efficiency analysis (overround, vig, fair prices)
// ---------------------------------------------------------------------------

export interface EfficiencyResult {
  overround: number;     // (sum(prices) - 1) * 100  (percentage)
  vig: number;           // ((sum - 1) / sum) * 100  (percentage)
  fairPrices: number[];  // normalized prices summing to 1.0
  isEfficient: boolean;  // |overround| <= 5%
}

/**
 * Analyze market efficiency from outcome prices.
 * For binary markets, pass [yesPrice, noPrice].
 * For multi-outcome, pass all outcome prices.
 */
export function analyzeEfficiency(prices: number[]): EfficiencyResult {
  if (prices.length === 0) {
    return { overround: 0, vig: 0, fairPrices: [], isEfficient: true };
  }

  const total = prices.reduce((sum, p) => sum + p, 0);
  const overround = (total - 1) * 100;
  const vig = total > 0 ? ((total - 1) / total) * 100 : 0;
  const fairPrices = total > 0 ? prices.map((p) => round(p / total, 4)) : prices;
  const isEfficient = Math.abs(overround) <= 5;

  return { overround: round(overround, 2), vig: round(vig, 2), fairPrices, isEfficient };
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
```

### efficiency.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { analyzeEfficiency } from './efficiency.js';

describe('analyzeEfficiency', () => {
  it('detects a fair market (prices sum to 1)', () => {
    const r = analyzeEfficiency([0.55, 0.45]);
    expect(r.overround).toBeCloseTo(0, 1);
    expect(r.isEfficient).toBe(true);
  });

  it('detects overround (prices sum > 1)', () => {
    const r = analyzeEfficiency([0.55, 0.52]);
    expect(r.overround).toBeGreaterThan(0);
    expect(r.vig).toBeGreaterThan(0);
  });

  it('detects underround (prices sum < 1) — possible arbitrage', () => {
    const r = analyzeEfficiency([0.45, 0.48]);
    expect(r.overround).toBeLessThan(0);
  });

  it('calculates fair prices that sum to 1', () => {
    const r = analyzeEfficiency([0.55, 0.52]);
    const sum = r.fairPrices.reduce((s, p) => s + p, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it('handles multiple outcomes', () => {
    const r = analyzeEfficiency([0.30, 0.25, 0.25, 0.25]);
    expect(r.overround).toBeCloseTo(5, 0);
    expect(r.fairPrices).toHaveLength(4);
  });

  it('marks inefficient market (overround > 5%)', () => {
    const r = analyzeEfficiency([0.60, 0.55]);
    expect(r.isEfficient).toBe(false);
  });

  it('handles empty prices array', () => {
    const r = analyzeEfficiency([]);
    expect(r.overround).toBe(0);
    expect(r.isEfficient).toBe(true);
  });
});
```

### liquidity.ts — Liquidity Scoring

```typescript
// ---------------------------------------------------------------------------
// math/liquidity.ts -- Liquidity scoring for prediction markets
// ---------------------------------------------------------------------------

export interface LiquidityResult {
  score: number;              // 0-100
  volumeComponent: number;    // 0-50
  liquidityComponent: number; // 0-50
  rating: 'low' | 'medium' | 'high';
}

/**
 * Composite liquidity score (0-100).
 *
 * volume_component    = min(50, (volume_usd / 100,000) * 50)
 * liquidity_component = min(50, (liquidity_usd / 50,000) * 50)
 * score = volume_component + liquidity_component
 */
export function liquidityScore(volumeUsd: number, liquidityUsd: number): LiquidityResult {
  const volumeComponent = Math.min(50, (Math.max(0, volumeUsd) / 100_000) * 50);
  const liquidityComponent = Math.min(50, (Math.max(0, liquidityUsd) / 50_000) * 50);
  const score = Math.round(volumeComponent + liquidityComponent);
  const rating = score < 30 ? 'low' : score < 70 ? 'medium' : 'high';

  return {
    score,
    volumeComponent: Math.round(volumeComponent),
    liquidityComponent: Math.round(liquidityComponent),
    rating,
  };
}
```

### liquidity.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { liquidityScore } from './liquidity.js';

describe('liquidityScore', () => {
  it('returns 100 for high volume and liquidity', () => {
    const r = liquidityScore(200_000, 100_000);
    expect(r.score).toBe(100);
    expect(r.rating).toBe('high');
  });

  it('returns 0 for zero volume and liquidity', () => {
    const r = liquidityScore(0, 0);
    expect(r.score).toBe(0);
    expect(r.rating).toBe('low');
  });

  it('returns medium for moderate values', () => {
    const r = liquidityScore(50_000, 25_000);
    expect(r.score).toBe(50);
    expect(r.rating).toBe('medium');
  });

  it('caps each component at 50', () => {
    const r = liquidityScore(1_000_000, 1_000_000);
    expect(r.volumeComponent).toBe(50);
    expect(r.liquidityComponent).toBe(50);
  });

  it('handles negative values gracefully', () => {
    const r = liquidityScore(-100, -50);
    expect(r.score).toBe(0);
  });
});
```

### time-value.ts — Time Decay Analysis

```typescript
// ---------------------------------------------------------------------------
// math/time-value.ts -- Time decay and near-expiry analysis
// ---------------------------------------------------------------------------

/**
 * Calculate days until market closes.
 * Returns 0 if already closed.
 */
export function daysToClose(closeDate: string): number {
  const close = new Date(closeDate).getTime();
  const now = Date.now();
  const diff = close - now;
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

/**
 * Time decay scoring.
 * Higher score = more time-decay opportunity.
 * Near-expiry markets with high probability prices are "bond-like" — low risk, guaranteed return.
 *
 * Score formula: (1 - daysRemaining/365) * (price * 100)
 * A market at 0.95 with 3 days left = (1 - 3/365) * 95 = 94.2
 * A market at 0.50 with 180 days left = (1 - 180/365) * 50 = 25.3
 */
export function timeDecayScore(days: number, price: number): number {
  if (days <= 0) return 0;
  const timeComponent = Math.max(0, 1 - days / 365);
  return Math.round(timeComponent * price * 100);
}

/**
 * Check if this is a "near-certain expiry" — the whale bond strategy.
 * Returns true if market is closing soon AND price is very high.
 *
 * @param days      Days to close
 * @param price     Current YES price
 * @param threshold Minimum price to consider "near-certain" (default 0.90)
 */
export function isNearCertainExpiry(
  days: number,
  price: number,
  threshold: number = 0.90,
): boolean {
  return days > 0 && days <= 7 && price >= threshold;
}
```

### time-value.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { daysToClose, timeDecayScore, isNearCertainExpiry } from './time-value.js';

describe('daysToClose', () => {
  it('returns positive days for future date', () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    expect(daysToClose(future)).toBe(5);
  });

  it('returns 0 for past date', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(daysToClose(past)).toBe(0);
  });
});

describe('timeDecayScore', () => {
  it('gives high score for near-expiry high-probability', () => {
    const score = timeDecayScore(3, 0.95);
    expect(score).toBeGreaterThan(90);
  });

  it('gives low score for far-out uncertain market', () => {
    const score = timeDecayScore(180, 0.50);
    expect(score).toBeLessThan(30);
  });

  it('returns 0 for expired market', () => {
    expect(timeDecayScore(0, 0.95)).toBe(0);
  });
});

describe('isNearCertainExpiry', () => {
  it('returns true for 3-day 95% market', () => {
    expect(isNearCertainExpiry(3, 0.95)).toBe(true);
  });

  it('returns false for 30-day 95% market', () => {
    expect(isNearCertainExpiry(30, 0.95)).toBe(false);
  });

  it('returns false for 3-day 50% market', () => {
    expect(isNearCertainExpiry(3, 0.50)).toBe(false);
  });

  it('returns false for expired market', () => {
    expect(isNearCertainExpiry(0, 0.99)).toBe(false);
  });
});
```

**Update math/index.ts** to export all three new modules.

**Step: Run tests, type check, commit**

```bash
git commit -m "feat(predict): math — efficiency analysis, liquidity scoring, time decay"
```

---

## Task 4: Math Layer — Bayesian, Brier, Correlation

The advanced math: Bayesian probability estimation (Tetlock method), Brier score calibration tracking, and cross-market title matching for arbitrage/correlation.

**Files:**
- Create: `src/math/bayesian.ts` + `src/math/bayesian.test.ts`
- Create: `src/math/brier.ts` + `src/math/brier.test.ts`
- Create: `src/math/correlation.ts` + `src/math/correlation.test.ts`
- Modify: `src/math/index.ts` (add exports)

### bayesian.ts — Probability Estimation

```typescript
// ---------------------------------------------------------------------------
// math/bayesian.ts -- Bayesian probability estimation (Tetlock method)
// ---------------------------------------------------------------------------

export interface Adjustment {
  factor: string;
  direction: 'up' | 'down';
  magnitude: number; // 0-1, how much to shift probability
  reasoning: string;
}

/**
 * Estimate probability using Tetlock's superforecasting method:
 * 1. Start with a base rate (outside view)
 * 2. Apply adjustments (inside view) — each shifts the probability
 *
 * Adjustments are applied multiplicatively to avoid overshooting:
 * - "up" adjustments: new = old + (1 - old) * magnitude
 * - "down" adjustments: new = old - old * magnitude
 *
 * This ensures the result stays in (0, 1) regardless of adjustment count.
 */
export function estimateProbability(baseRate: number, adjustments: Adjustment[]): number {
  let prob = Math.max(0.01, Math.min(0.99, baseRate));

  for (const adj of adjustments) {
    const mag = Math.max(0, Math.min(1, adj.magnitude));
    if (adj.direction === 'up') {
      prob = prob + (1 - prob) * mag;
    } else {
      prob = prob - prob * mag;
    }
  }

  return round(Math.max(0.01, Math.min(0.99, prob)), 4);
}

/**
 * Classical Bayesian update: posterior = (prior * likelihood) / evidence
 * Simplified: given a likelihood ratio, update prior.
 *
 * posterior = prior * LR / (prior * LR + (1 - prior))
 */
export function bayesianUpdate(prior: number, likelihoodRatio: number): number {
  if (prior <= 0 || prior >= 1 || likelihoodRatio <= 0) return prior;
  const numerator = prior * likelihoodRatio;
  const denominator = numerator + (1 - prior);
  return round(numerator / denominator, 4);
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
```

### bayesian.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { estimateProbability, bayesianUpdate } from './bayesian.js';

describe('estimateProbability', () => {
  it('returns base rate with no adjustments', () => {
    expect(estimateProbability(0.50, [])).toBeCloseTo(0.50, 2);
  });

  it('adjusts upward', () => {
    const result = estimateProbability(0.50, [
      { factor: 'polling', direction: 'up', magnitude: 0.3, reasoning: 'Strong polling lead' },
    ]);
    expect(result).toBeGreaterThan(0.50);
    expect(result).toBeCloseTo(0.65, 2);
  });

  it('adjusts downward', () => {
    const result = estimateProbability(0.70, [
      { factor: 'scandal', direction: 'down', magnitude: 0.2, reasoning: 'Recent scandal' },
    ]);
    expect(result).toBeLessThan(0.70);
    expect(result).toBeCloseTo(0.56, 2);
  });

  it('never exceeds 0.99', () => {
    const result = estimateProbability(0.95, [
      { factor: 'a', direction: 'up', magnitude: 0.9, reasoning: '' },
      { factor: 'b', direction: 'up', magnitude: 0.9, reasoning: '' },
    ]);
    expect(result).toBeLessThanOrEqual(0.99);
  });

  it('never goes below 0.01', () => {
    const result = estimateProbability(0.05, [
      { factor: 'a', direction: 'down', magnitude: 0.9, reasoning: '' },
      { factor: 'b', direction: 'down', magnitude: 0.9, reasoning: '' },
    ]);
    expect(result).toBeGreaterThanOrEqual(0.01);
  });

  it('handles multiple adjustments', () => {
    const result = estimateProbability(0.50, [
      { factor: 'polling', direction: 'up', magnitude: 0.2, reasoning: '' },
      { factor: 'economy', direction: 'down', magnitude: 0.1, reasoning: '' },
    ]);
    // Up 20% of remaining, then down 10% of current
    expect(result).toBeGreaterThan(0.50);
  });
});

describe('bayesianUpdate', () => {
  it('increases probability with likelihood > 1', () => {
    expect(bayesianUpdate(0.50, 3.0)).toBeGreaterThan(0.50);
  });

  it('decreases probability with likelihood < 1', () => {
    expect(bayesianUpdate(0.50, 0.3)).toBeLessThan(0.50);
  });

  it('returns same with likelihood = 1', () => {
    expect(bayesianUpdate(0.50, 1.0)).toBeCloseTo(0.50, 4);
  });

  it('converges toward 1 with strong evidence', () => {
    expect(bayesianUpdate(0.50, 100)).toBeGreaterThan(0.98);
  });
});
```

### brier.ts — Calibration Tracking

```typescript
// ---------------------------------------------------------------------------
// math/brier.ts -- Brier score and calibration tracking
// ---------------------------------------------------------------------------

import type { Forecast } from '../types/index.js';

export interface CalibrationBucket {
  range: string;
  predicted: number;
  actual: number;
  count: number;
  deviation: number;
}

/**
 * Brier score: mean squared error of probability predictions.
 * 0 = perfect, 1 = worst possible.
 *
 * BS = (1/N) * Σ (predicted - actual)²
 */
export function brierScore(forecasts: Forecast[]): number {
  if (forecasts.length === 0) return 0;
  const sum = forecasts.reduce(
    (acc, f) => acc + (f.predictedProbability - f.actualOutcome) ** 2,
    0,
  );
  return round(sum / forecasts.length, 4);
}

/**
 * Build calibration curve: group forecasts into 10 buckets (0-0.1, 0.1-0.2, etc.)
 * and compare predicted vs actual resolution rates.
 */
export function calibrationBuckets(forecasts: Forecast[]): CalibrationBucket[] {
  const buckets: Map<string, { predicted: number[]; actual: number[] }> = new Map();

  for (let i = 0; i < 10; i++) {
    const lo = i / 10;
    const hi = (i + 1) / 10;
    const range = `${lo.toFixed(1)}-${hi.toFixed(1)}`;
    buckets.set(range, { predicted: [], actual: [] });
  }

  for (const f of forecasts) {
    const idx = Math.min(9, Math.floor(f.predictedProbability * 10));
    const lo = idx / 10;
    const hi = (idx + 1) / 10;
    const range = `${lo.toFixed(1)}-${hi.toFixed(1)}`;
    const bucket = buckets.get(range)!;
    bucket.predicted.push(f.predictedProbability);
    bucket.actual.push(f.actualOutcome);
  }

  const result: CalibrationBucket[] = [];
  for (const [range, data] of buckets) {
    if (data.predicted.length === 0) continue;
    const predicted = avg(data.predicted);
    const actual = avg(data.actual);
    result.push({
      range,
      predicted: round(predicted, 3),
      actual: round(actual, 3),
      count: data.predicted.length,
      deviation: round(Math.abs(predicted - actual), 3),
    });
  }

  return result;
}

/**
 * Overconfidence score: average (predicted - actual) across all buckets.
 * Positive = overconfident (predicted higher than actual).
 * Negative = underconfident.
 */
export function overconfidenceScore(buckets: CalibrationBucket[]): number {
  if (buckets.length === 0) return 0;
  const sum = buckets.reduce((acc, b) => acc + (b.predicted - b.actual) * b.count, 0);
  const total = buckets.reduce((acc, b) => acc + b.count, 0);
  return total > 0 ? round(sum / total, 4) : 0;
}

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
```

### brier.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { brierScore, calibrationBuckets, overconfidenceScore } from './brier.js';
import type { Forecast } from '../types/index.js';

describe('brierScore', () => {
  it('returns 0 for perfect predictions', () => {
    const forecasts: Forecast[] = [
      { predictedProbability: 1.0, actualOutcome: 1 },
      { predictedProbability: 0.0, actualOutcome: 0 },
    ];
    expect(brierScore(forecasts)).toBe(0);
  });

  it('returns 1 for worst predictions', () => {
    const forecasts: Forecast[] = [
      { predictedProbability: 1.0, actualOutcome: 0 },
      { predictedProbability: 0.0, actualOutcome: 1 },
    ];
    expect(brierScore(forecasts)).toBe(1);
  });

  it('returns 0.25 for 50/50 predictions on random outcomes', () => {
    const forecasts: Forecast[] = [
      { predictedProbability: 0.5, actualOutcome: 1 },
      { predictedProbability: 0.5, actualOutcome: 0 },
    ];
    expect(brierScore(forecasts)).toBeCloseTo(0.25, 2);
  });

  it('returns 0 for empty array', () => {
    expect(brierScore([])).toBe(0);
  });
});

describe('calibrationBuckets', () => {
  it('groups forecasts into buckets', () => {
    const forecasts: Forecast[] = [
      { predictedProbability: 0.75, actualOutcome: 1 },
      { predictedProbability: 0.72, actualOutcome: 0 },
      { predictedProbability: 0.25, actualOutcome: 0 },
    ];
    const buckets = calibrationBuckets(forecasts);
    expect(buckets.length).toBeGreaterThan(0);
    // The 0.7-0.8 bucket should have 2 entries
    const b70 = buckets.find((b) => b.range === '0.7-0.8');
    expect(b70?.count).toBe(2);
  });

  it('returns empty for no forecasts', () => {
    expect(calibrationBuckets([])).toEqual([]);
  });
});

describe('overconfidenceScore', () => {
  it('returns positive for overconfident predictions', () => {
    const buckets = [
      { range: '0.7-0.8', predicted: 0.75, actual: 0.50, count: 10, deviation: 0.25 },
    ];
    expect(overconfidenceScore(buckets)).toBeGreaterThan(0);
  });

  it('returns negative for underconfident predictions', () => {
    const buckets = [
      { range: '0.3-0.4', predicted: 0.35, actual: 0.60, count: 10, deviation: 0.25 },
    ];
    expect(overconfidenceScore(buckets)).toBeLessThan(0);
  });
});
```

### correlation.ts — Market Matching

```typescript
// ---------------------------------------------------------------------------
// math/correlation.ts -- Cross-market title matching and spread calculation
// ---------------------------------------------------------------------------

import type { Market, MatchedPair } from '../types/index.js';

/**
 * Calculate title similarity between two market titles.
 * Uses word overlap method: shared_words / max(words_in_A, words_in_B)
 *
 * @returns 0-1 similarity score
 */
export function titleSimilarity(titleA: string, titleB: string): number {
  const cleanA = titleA.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const cleanB = titleB.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  // Exact match
  if (cleanA === cleanB) return 1.0;

  const wordsA = new Set(cleanA.split(/\s+/).filter(Boolean));
  const wordsB = new Set(cleanB.split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }

  return round(shared / Math.max(wordsA.size, wordsB.size), 4);
}

/**
 * Match markets across two sets by title similarity.
 * Returns pairs with similarity >= minSimilarity (default 0.60).
 */
export function matchMarkets(
  marketsA: Market[],
  marketsB: Market[],
  minSimilarity: number = 0.60,
): MatchedPair[] {
  const pairs: MatchedPair[] = [];

  for (const a of marketsA) {
    for (const b of marketsB) {
      // Skip if same platform and same ID
      if (a.platform === b.platform && a.externalId === b.externalId) continue;

      const similarity = titleSimilarity(a.title, b.title);
      if (similarity >= minSimilarity) {
        pairs.push({ marketA: a, marketB: b, similarity });
      }
    }
  }

  // Sort by similarity descending
  return pairs.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate spread between two prices.
 * spread = ((priceB - priceA) / priceA) * 100
 */
export function calculateSpread(priceA: number, priceB: number): number {
  if (priceA <= 0) return 0;
  return round(((priceB - priceA) / priceA) * 100, 2);
}

/**
 * Calculate arbitrage profit.
 * If YES_A + NO_B < 1.0, guaranteed profit exists.
 *
 * @param yesPrice  Price of YES on platform A
 * @param noPrice   Price of NO on platform B (= 1 - yesPrice_B)
 * @returns { combinedCost, profit, profitPct } or null if no arb
 */
export function calculateArbitrage(
  yesPrice: number,
  noPrice: number,
): { combinedCost: number; profit: number; profitPct: number } | null {
  const combinedCost = yesPrice + noPrice;
  if (combinedCost >= 1.0) return null;

  const profit = round(1.0 - combinedCost, 4);
  const profitPct = round((profit / combinedCost) * 100, 2);

  return { combinedCost: round(combinedCost, 4), profit, profitPct };
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
```

### correlation.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { titleSimilarity, matchMarkets, calculateSpread, calculateArbitrage } from './correlation.js';
import type { Market } from '../types/index.js';

describe('titleSimilarity', () => {
  it('returns 1.0 for identical titles', () => {
    expect(titleSimilarity('Will Bitcoin hit $100k?', 'Will Bitcoin hit $100k?')).toBe(1.0);
  });

  it('returns 1.0 for titles differing only in punctuation', () => {
    expect(titleSimilarity('Will Bitcoin hit 100k?', 'Will Bitcoin hit 100k')).toBe(1.0);
  });

  it('returns high similarity for similar titles', () => {
    const score = titleSimilarity(
      'Will Bitcoin price exceed $100,000 by end of 2026?',
      'Will Bitcoin hit $100,000 in 2026?',
    );
    expect(score).toBeGreaterThan(0.5);
  });

  it('returns low similarity for unrelated titles', () => {
    const score = titleSimilarity(
      'Will Bitcoin hit $100k?',
      'Who will win the Super Bowl?',
    );
    expect(score).toBeLessThan(0.3);
  });

  it('handles empty strings', () => {
    expect(titleSimilarity('', 'test')).toBe(0);
  });
});

describe('calculateSpread', () => {
  it('calculates positive spread', () => {
    expect(calculateSpread(0.40, 0.45)).toBeCloseTo(12.5, 1);
  });

  it('returns 0 for equal prices', () => {
    expect(calculateSpread(0.50, 0.50)).toBe(0);
  });

  it('handles zero price', () => {
    expect(calculateSpread(0, 0.50)).toBe(0);
  });
});

describe('calculateArbitrage', () => {
  it('detects arbitrage when combined cost < 1', () => {
    const result = calculateArbitrage(0.40, 0.50);
    expect(result).not.toBeNull();
    expect(result!.combinedCost).toBe(0.90);
    expect(result!.profit).toBeCloseTo(0.10, 2);
    expect(result!.profitPct).toBeCloseTo(11.11, 1);
  });

  it('returns null when no arbitrage exists', () => {
    expect(calculateArbitrage(0.55, 0.50)).toBeNull();
  });

  it('returns null when combined cost equals 1', () => {
    expect(calculateArbitrage(0.50, 0.50)).toBeNull();
  });
});

describe('matchMarkets', () => {
  const makeMarket = (platform: string, title: string, price: number): Market => ({
    platform: platform as any,
    externalId: `${platform}-${title.slice(0, 10)}`,
    title,
    description: '',
    category: 'politics',
    resolutionType: 'binary',
    outcomes: [{ label: 'Yes', price }, { label: 'No', price: 1 - price }],
    currentPrices: { yes: price, no: 1 - price },
    volumeUsd: 100_000,
    liquidityUsd: 50_000,
    closeDate: '2026-12-31T00:00:00Z',
    status: 'open',
    url: `https://${platform}.com/market/1`,
  });

  it('matches similar markets across platforms', () => {
    const marketsA = [makeMarket('polymarket', 'Will Bitcoin hit $100k in 2026?', 0.55)];
    const marketsB = [makeMarket('manifold', 'Will Bitcoin hit $100k in 2026?', 0.60)];
    const pairs = matchMarkets(marketsA, marketsB);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.similarity).toBe(1.0);
  });

  it('filters below threshold', () => {
    const marketsA = [makeMarket('polymarket', 'Will Bitcoin hit $100k?', 0.55)];
    const marketsB = [makeMarket('manifold', 'Who will win the Super Bowl?', 0.60)];
    const pairs = matchMarkets(marketsA, marketsB);
    expect(pairs).toHaveLength(0);
  });
});
```

**Update math/index.ts** to export all new modules.

**Step: Run tests, type check, commit**

```bash
git commit -m "feat(predict): math — Bayesian estimation, Brier calibration, market correlation"
```

---

## Task 5: Platform Adapters

**Files:**
- Create: `src/adapters/types.ts`
- Create: `src/adapters/registry.ts` + `src/adapters/registry.test.ts`
- Create: `src/adapters/polymarket.ts` + `src/adapters/polymarket.test.ts`
- Create: `src/adapters/manifold.ts` + `src/adapters/manifold.test.ts`
- Create: `src/adapters/kalshi.ts` + `src/adapters/kalshi.test.ts`

The adapter interface, registry, and 3 platform adapters with mocked HTTP tests.

**NOTE to implementer**: Platform adapters make real HTTP calls in production. In tests, mock the `fetch()` function using vitest's `vi.fn()`. Each adapter should use Bottleneck for rate limiting. See design doc for API base URLs and rate limits per platform.

**Key implementation details:**

- `src/adapters/types.ts`: Define `IPlatformAdapter` interface with methods: `searchMarkets`, `getMarket`, `getTrending`, `getMarketPrices`, `getPriceHistory?`, `getResolvedMarkets?`
- `src/adapters/registry.ts`: Same pattern as trade's `AdapterRegistry` but keyed on `PlatformId` instead of `ExchangeId`
- `src/adapters/polymarket.ts`: Gamma API at `https://gamma-api.polymarket.com`. Map `outcomePrices` → `currentPrices`, `endDate` → `closeDate`, `active`/`resolved` → `status`. Rate limit: 3 concurrent, 300ms delay.
- `src/adapters/manifold.ts`: v0 API at `https://api.manifold.markets/v0`. Map `question` → `title`, `probability` → `currentPrices.yes` (for binary). Rate limit: 3 concurrent, 200ms delay.
- `src/adapters/kalshi.ts`: v2 API at `https://api.elections.kalshi.com/trade-api/v2`. Requires auth. The adapter should work in read-only mode when no credentials are provided — just return empty arrays instead of throwing. Rate limit: 3 concurrent, 500ms delay.

**Tests**: Mock `fetch` to return realistic API responses. Test the normalization from platform-specific format to unified `Market` type. Test that the registry correctly stores and retrieves adapters.

**Step: Run tests, type check, commit**

```bash
git commit -m "feat(predict): platform adapters — Polymarket, Manifold, Kalshi with rate limiting"
```

---

## Task 6: Brain Types + Analysis Engine

**Files:**
- Create: `src/brain/types.ts`
- Create: `src/brain/analysis.ts` + `src/brain/analysis.test.ts`

This is the core — the `runEvaluation()` function that combines all math functions into a structured `EvaluateResult`.

**See design doc for complete type definitions.** The key types to create in `brain/types.ts`:
- `MarketVerdict` = `'BUY_YES' | 'BUY_NO' | 'SKIP' | 'HEDGE'`
- `EdgeType` (7 edge categories)
- `EvaluateResult` (the ThinkResult equivalent — schemaVersion, market, verdict, score, calibration, edge, evidence, sizing, risks, invalidation, provenance)
- `DiscoverResult`, `DiscoverItem`
- `ArbitrageResult`, `ArbitrageOpportunity`
- `CorrelateResult`, `CorrelatedPair`
- `SizeResult`, `PositionAllocation`
- `CalibrateResult`

**The `runEvaluation()` function** (`brain/analysis.ts`):

```typescript
interface EvaluationParams {
  market: Market;
  estimatedProbability?: number; // user's estimate, or we use market price
  bankroll: number;
  maxFraction?: number;
  adjustments?: Adjustment[];
}
```

Algorithm:
1. If no `estimatedProbability`, use `market.currentPrices.yes` (no edge detected)
2. If `adjustments` provided, run `estimateProbability(baseRate, adjustments)`
3. Compute edge: `edgePct = (estimatedProbability - marketPrice) * 100`
4. Compute EV via `expectedValue()`
5. Compute Kelly via `kellyFraction()`
6. Compute efficiency via `analyzeEfficiency()`
7. Compute liquidity via `liquidityScore()`
8. Compute time decay via `daysToClose()` and `timeDecayScore()`
9. Build `evidence` object with baseRate, adjustments, marketEfficiency, liquidity
10. Classify edge type (base_rate_deviation, time_decay, etc.)
11. Build invalidation string
12. Build risks array
13. Score: `min(100, round(abs(edgePct) * 3 + liq.score * 0.2 + timeDecayBonus))`
14. Verdict: edgePct >= 5 → BUY_YES/BUY_NO, edgePct < 2 → SKIP

**Tests should cover:**
- Positive edge → BUY_YES
- Negative edge → SKIP
- No probability provided → SKIP (no edge to detect)
- With adjustments → correct Bayesian estimate
- High-probability near-expiry → time_decay edge type
- Score bounds (0-100)
- Kelly sizing is present and correct
- Evidence object is fully populated
- schemaVersion is '1.0'
- Insufficient data handling

**Step: Run tests, type check, commit**

```bash
git commit -m "feat(predict): brain analysis engine — runEvaluation with 6 edge detection strategies"
```

---

## Task 7: Brain Tools + Formatter

**Files:**
- Create: `src/brain/formatter.ts`
- Create: `src/brain/tools.ts` + `src/brain/tools.test.ts`
- Create: `src/brain/index.ts`

**Formatter** (`formatter.ts`): Format each result type into structured plaintext (same pattern as trade). `formatEvaluateResult`, `formatDiscoverResult`, `formatArbitrageResult`, `formatCalibrateResult`.

**Tools** (`tools.ts`): Create all 7 brain tools. Each tool returns JSON by default with `format: 'text'` option.

```typescript
interface BrainDeps {
  registry: PlatformRegistry;
  config: PluginConfig;
}
```

**lucid_evaluate**: Parse query (URL, market ID, or natural language) → find market → runEvaluation → return EvaluateResult

**lucid_discover**: Search across all platforms → run quick EV analysis on each → filter by edge > threshold → sort → return DiscoverResult

**lucid_arbitrage**: Fetch open markets from all platforms → matchMarkets → calculateArbitrage on each pair → filter by minSpreadPct → return ArbitrageResult

**lucid_correlate**: Fetch markets from all platforms → find similar titles across platforms/within platform where one is resolved → highlight correlation lag → return CorrelateResult

**lucid_size**: Take array of position params → run portfolioKelly → return SizeResult

**lucid_calibrate**: Take array of forecasts → brierScore + calibrationBuckets + overconfidenceScore → return CalibrateResult

**lucid_pro**: List all math/adapter tools or execute one directly (same pattern as trade)

**Tests**: Mock adapters, verify each tool returns valid JSON, test format=text, test error cases.

**Step: Run tests, type check, commit**

```bash
git commit -m "feat(predict): 7 brain tools — evaluate, discover, arbitrage, correlate, size, calibrate, pro"
```

---

## Task 8: Integration (MCP Server, OpenClaw, Barrel Exports, Domain)

**Files:**
- Create: `src/mcp.ts`
- Create: `src/openclaw.ts`
- Create: `src/bin.ts`
- Create: `src/domain.ts`
- Create: `src/index.ts`
- Modify: `src/tools/index.ts` (add `createAllTools`)

Mirror trade's patterns exactly:
- `mcp.ts`: Create `createPredictServer()` that loads config, creates registry, registers adapters (Polymarket + Manifold always, Kalshi when credentials present), creates tools, registers with McpServer
- `openclaw.ts`: Default export `register(api)` function
- `bin.ts`: `#!/usr/bin/env node` entry point that starts MCP server
- `domain.ts`: Duck-typed `predictDomain` adapter with `canHandle()` using PREDICT_KEYWORDS regex (predict, forecast, probability, polymarket, manifold, kalshi, arbitrage, odds, kelly, etc.)
- `index.ts`: Barrel exports of everything

**Step: Run full test suite, type check, commit**

```bash
git commit -m "feat(predict): MCP server, OpenClaw, barrel exports, domain adapter — v5 complete"
```

---

## Summary

| Task | Description | Est. Tests |
|------|-------------|-----------|
| 1 | Foundation scaffold | 0 (compile check) |
| 2 | Math: EV, Kelly, Odds | ~17 |
| 3 | Math: Efficiency, Liquidity, Time Value | ~17 |
| 4 | Math: Bayesian, Brier, Correlation | ~20 |
| 5 | Platform Adapters (3) | ~15 |
| 6 | Brain Analysis Engine | ~15 |
| 7 | Brain Tools (7) + Formatter | ~15 |
| 8 | Integration (MCP, OpenClaw, exports) | ~5 |
| **Total** | | **~104 tests** |
