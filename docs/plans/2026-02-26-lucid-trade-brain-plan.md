# Lucid Trade — Brain Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform lucid-trade from 10 granular TA tools into 7 smart brain tools that orchestrate the existing 97-function intelligence engine, with a pro escape hatch for power users.

**Architecture:** The 7 brain tools (`lucid_think`, `lucid_scan`, `lucid_execute`, `lucid_watch`, `lucid_protect`, `lucid_review`, `lucid_pro`) are registered as MCP tools. Each brain tool parses user intent, loads context, delegates to the intelligence engine, and returns a complete formatted response. The existing 10 TA tools become pro-mode tools accessible via `lucid_pro`. A `TradeDomainAdapter` wraps everything for future brain SDK integration.

**Tech Stack:** TypeScript, MCP SDK ^1.26.0, Zod, Vitest, existing intelligence engine (indicators, trend, risk-engine, backtester)

**Baseline:** 97 tests passing across 7 test files. All code in `skills/lucid-trade/src/`.

---

## Task 1: Brain Types & Response Formatting

Define the type system for brain tools and the consistent response format.

**Files:**
- Create: `src/brain/types.ts`
- Create: `src/brain/formatter.ts`
- Create: `src/brain/types.test.ts`

**Step 1: Write the failing test**

```typescript
// src/brain/types.test.ts
import { describe, it, expect } from 'vitest';
import { formatThinkResult, formatProtectResult, formatReviewResult } from './formatter.js';

describe('brain formatter', () => {
  describe('formatThinkResult', () => {
    it('formats a complete think result into structured text', () => {
      const result = formatThinkResult({
        symbol: 'SOL/USDT',
        verdict: 'BUY',
        confidence: 72,
        why: [
          'RSI(14) = 34 — approaching oversold',
          'MACD bullish crossover forming on 4h',
          'Support holding at $145',
        ],
        how: {
          venue: 'hyperliquid',
          size: '$600 (2% risk)',
          entry: 148.5,
          stopLoss: 142.2,
          takeProfit: 162.0,
          riskReward: '2.2:1',
          leverage: '5x',
        },
        risks: [
          'BTC macro downtrend could drag alts',
          'Liquidation at $134.80',
        ],
      });
      expect(result).toContain('SOL/USDT');
      expect(result).toContain('BUY');
      expect(result).toContain('72');
      expect(result).toContain('RSI(14)');
      expect(result).toContain('hyperliquid');
      expect(result).toContain('142.2');
    });

    it('formats a WAIT verdict without how section', () => {
      const result = formatThinkResult({
        symbol: 'ETH/USDT',
        verdict: 'WAIT',
        confidence: 45,
        why: ['No clear trend — sideways on all timeframes'],
        risks: ['Chop zone — high probability of stop hunts'],
      });
      expect(result).toContain('WAIT');
      expect(result).not.toContain('Entry');
    });
  });

  describe('formatProtectResult', () => {
    it('formats risk check results', () => {
      const result = formatProtectResult({
        overallRisk: 'MEDIUM',
        checks: [
          { name: 'Liquidation proximity', status: 'ok', detail: 'Nearest liquidation 15% away' },
          { name: 'Concentration', status: 'warning', detail: 'SOL is 45% of portfolio (>30% threshold)' },
        ],
      });
      expect(result).toContain('MEDIUM');
      expect(result).toContain('Concentration');
      expect(result).toContain('warning');
    });
  });

  describe('formatReviewResult', () => {
    it('formats performance review', () => {
      const result = formatReviewResult({
        period: '30d',
        totalPnl: '+12.3%',
        winRate: '68%',
        sharpe: 1.8,
        bestSetup: 'Breakout (82% win rate)',
        worstSetup: 'Mean reversion (38% win rate)',
        suggestion: 'Stop taking mean reversion trades — your edge is in breakouts.',
      });
      expect(result).toContain('12.3%');
      expect(result).toContain('68%');
      expect(result).toContain('Breakout');
      expect(result).toContain('Stop taking mean reversion');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd skills/lucid-trade && npx vitest run src/brain/types.test.ts`
Expected: FAIL — module not found

**Step 3: Write the types and formatter**

```typescript
// src/brain/types.ts

/** Verdict the brain produces for think() */
export type Verdict = 'BUY' | 'SELL' | 'WAIT' | 'CLOSE';

/** Full analysis result from think() */
export interface ThinkResult {
  symbol: string;
  verdict: Verdict;
  confidence: number;        // 0-100
  why: string[];             // bullet points
  how?: {                    // only present if BUY or SELL
    venue: string;
    size: string;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    riskReward: string;
    leverage: string;
  };
  risks: string[];
}

/** Scan result — list of opportunities */
export interface ScanItem {
  symbol: string;
  exchange: string;
  signal: string;            // "breakout", "oversold bounce", etc.
  confidence: number;
  volume24h?: number;
  priceChange24h?: number;
}

export interface ScanResult {
  criteria: string;
  matches: ScanItem[];
  scannedExchanges: string[];
  scannedPairs: number;
}

/** Execute result */
export interface ExecuteResult {
  status: 'executed' | 'rejected' | 'needs_confirmation';
  reason?: string;           // why rejected or needs confirmation
  orderId?: string;
  exchange?: string;
  symbol?: string;
  side?: string;
  size?: number;
  price?: number;
}

/** Watch result */
export interface WatchResult {
  alertId: string;
  type: 'price' | 'pnl' | 'drawdown' | 'custom';
  condition: string;
  status: 'active';
}

/** Protect risk check */
export interface ProtectCheck {
  name: string;
  status: 'ok' | 'warning' | 'danger';
  detail: string;
}

export interface ProtectResult {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  checks: ProtectCheck[];
}

/** Review performance */
export interface ReviewResult {
  period: string;
  totalPnl: string;
  winRate: string;
  sharpe: number;
  bestSetup: string;
  worstSetup: string;
  suggestion: string;
}

/** Context passed to domain adapter methods */
export interface BrainContext {
  /** User identity (empty string in standalone MCP mode) */
  userId: string;
  /** User preferences loaded from memory (empty array if no memory) */
  preferences: string[];
  /** Available exchanges in the registry */
  exchanges: string[];
}
```

```typescript
// src/brain/formatter.ts
import type { ThinkResult, ProtectResult, ReviewResult, ScanResult } from './types.js';

export function formatThinkResult(r: ThinkResult): string {
  const lines: string[] = [];
  lines.push(`${r.symbol} — ${r.verdict} (Confidence: ${r.confidence}/100)`);
  lines.push('');
  lines.push('WHY:');
  for (const w of r.why) lines.push(`  • ${w}`);
  if (r.how) {
    lines.push('');
    lines.push('HOW:');
    lines.push(`  • Best venue: ${r.how.venue}`);
    lines.push(`  • Size: ${r.how.size}`);
    lines.push(`  • Entry: $${r.how.entry} | SL: $${r.how.stopLoss} | TP: $${r.how.takeProfit}`);
    lines.push(`  • R:R: ${r.how.riskReward} | Leverage: ${r.how.leverage}`);
  }
  lines.push('');
  lines.push('RISKS:');
  for (const risk of r.risks) lines.push(`  • ${risk}`);
  return lines.join('\n');
}

export function formatScanResult(r: ScanResult): string {
  const lines: string[] = [];
  lines.push(`Scan: "${r.criteria}" — ${r.matches.length} matches (${r.scannedPairs} pairs across ${r.scannedExchanges.join(', ')})`);
  lines.push('');
  for (const m of r.matches) {
    lines.push(`  ${m.symbol} (${m.exchange}) — ${m.signal} [${m.confidence}/100]`);
  }
  if (r.matches.length === 0) lines.push('  No matches found.');
  return lines.join('\n');
}

export function formatProtectResult(r: ProtectResult): string {
  const lines: string[] = [];
  lines.push(`Risk Level: ${r.overallRisk}`);
  lines.push('');
  for (const c of r.checks) {
    const icon = c.status === 'ok' ? 'OK' : c.status === 'warning' ? 'WARN' : 'DANGER';
    lines.push(`  [${icon}] ${c.name}: ${c.detail}`);
  }
  return lines.join('\n');
}

export function formatReviewResult(r: ReviewResult): string {
  const lines: string[] = [];
  lines.push(`Performance Review (${r.period})`);
  lines.push('');
  lines.push(`  PnL: ${r.totalPnl}`);
  lines.push(`  Win Rate: ${r.winRate}`);
  lines.push(`  Sharpe: ${r.sharpe}`);
  lines.push(`  Best: ${r.bestSetup}`);
  lines.push(`  Worst: ${r.worstSetup}`);
  lines.push('');
  lines.push(`Suggestion: ${r.suggestion}`);
  return lines.join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `cd skills/lucid-trade && npx vitest run src/brain/types.test.ts`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add src/brain/types.ts src/brain/formatter.ts src/brain/types.test.ts
git commit -m "feat(trade): add brain types and response formatters"
```

---

## Task 2: Brain Analysis Engine (lucid_think internals)

Wire the existing intelligence engine into a `runAnalysis()` function that produces a complete `ThinkResult` from raw OHLCV data.

**Files:**
- Create: `src/brain/analysis.ts`
- Create: `src/brain/analysis.test.ts`

**Step 1: Write the failing test**

```typescript
// src/brain/analysis.test.ts
import { describe, it, expect } from 'vitest';
import { runAnalysis } from './analysis.js';
import type { OHLCV } from '../types/index.js';

// 50-bar synthetic data with uptrend + pullback pattern
function makeTestCandles(count: number, base: number, trendUp: boolean): OHLCV[] {
  return Array.from({ length: count }, (_, i) => {
    const drift = trendUp ? i * 0.5 : -i * 0.3;
    const noise = Math.sin(i * 0.7) * 2;
    const close = base + drift + noise;
    return {
      timestamp: Date.now() - (count - i) * 3600_000,
      open: close - 0.5,
      high: close + 1,
      low: close - 1.5,
      close,
      volume: 1000 + Math.random() * 500,
    };
  });
}

describe('runAnalysis', () => {
  it('returns a ThinkResult with all required fields', () => {
    const candles = makeTestCandles(60, 100, true);
    const result = runAnalysis({
      symbol: 'SOL/USDT',
      candles,
      portfolioValue: 10000,
      riskPct: 2,
    });

    expect(result.symbol).toBe('SOL/USDT');
    expect(['BUY', 'SELL', 'WAIT', 'CLOSE']).toContain(result.verdict);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.why.length).toBeGreaterThan(0);
    expect(result.risks.length).toBeGreaterThan(0);
  });

  it('produces BUY verdict for strong uptrend data', () => {
    const candles = makeTestCandles(60, 100, true);
    const result = runAnalysis({
      symbol: 'BTC/USDT',
      candles,
      portfolioValue: 50000,
      riskPct: 2,
    });
    // With uptrend data, should lean BUY or WAIT, never SELL
    expect(['BUY', 'WAIT']).toContain(result.verdict);
  });

  it('includes position sizing in how section when verdict is BUY', () => {
    const candles = makeTestCandles(60, 100, true);
    const result = runAnalysis({
      symbol: 'ETH/USDT',
      candles,
      portfolioValue: 10000,
      riskPct: 2,
    });
    if (result.verdict === 'BUY') {
      expect(result.how).toBeDefined();
      expect(result.how!.stopLoss).toBeLessThan(result.how!.entry);
      expect(result.how!.takeProfit).toBeGreaterThan(result.how!.entry);
    }
  });

  it('never produces negative confidence', () => {
    const candles = makeTestCandles(60, 100, false);
    const result = runAnalysis({
      symbol: 'DOGE/USDT',
      candles,
      portfolioValue: 1000,
      riskPct: 5,
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd skills/lucid-trade && npx vitest run src/brain/analysis.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the analysis engine**

```typescript
// src/brain/analysis.ts
import type { OHLCV } from '../types/index.js';
import type { ThinkResult, Verdict } from './types.js';
import { rsi, macd, bollingerBands, atr, ema } from '../intelligence/indicators.js';
import { detectTrend, findSupportResistance, classifyVolatilityRegime, volatilityMultiplier } from '../intelligence/trend.js';
import { fixedPercentageSize, calculateRiskReward, calculateLiquidationPrice } from '../intelligence/risk-engine.js';

export interface AnalysisParams {
  symbol: string;
  candles: OHLCV[];
  portfolioValue: number;
  riskPct: number;
  leverage?: number;
  venue?: string;
}

export function runAnalysis(params: AnalysisParams): ThinkResult {
  const { symbol, candles, portfolioValue, riskPct, leverage = 1, venue = 'unknown' } = params;

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const lastClose = closes[closes.length - 1]!;

  // --- Run all indicators ---
  const rsiValues = rsi(closes, 14);
  const currentRsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1]! : 50;

  const macdResult = macd(closes, 12, 26, 9);
  const currentMacdHist = macdResult.histogram.length > 0
    ? macdResult.histogram[macdResult.histogram.length - 1]!
    : 0;
  const prevMacdHist = macdResult.histogram.length > 1
    ? macdResult.histogram[macdResult.histogram.length - 2]!
    : 0;
  const macdCrossover = prevMacdHist < 0 && currentMacdHist > 0;
  const macdCrossunder = prevMacdHist > 0 && currentMacdHist < 0;

  const bb = bollingerBands(closes, 20, 2);
  const currentBb = bb.length > 0 ? bb[bb.length - 1]! : null;

  const atrValues = atr(candles, 14);
  const currentAtr = atrValues.length > 0 ? atrValues[atrValues.length - 1]! : lastClose * 0.02;

  const trend = detectTrend(candles);
  const sr = findSupportResistance(candles);
  const volRegime = classifyVolatilityRegime(candles);
  const volMult = volatilityMultiplier(volRegime);

  // --- Build "why" bullets ---
  const why: string[] = [];
  why.push(`RSI(14) = ${currentRsi.toFixed(1)}${currentRsi < 30 ? ' — oversold' : currentRsi > 70 ? ' — overbought' : ''}`);
  why.push(`MACD histogram: ${currentMacdHist.toFixed(4)}${macdCrossover ? ' — bullish crossover' : macdCrossunder ? ' — bearish crossunder' : ''}`);
  why.push(`Trend: ${trend.trend} (SMA20 ${trend.sma20.toFixed(2)}, SMA50 ${trend.sma50.toFixed(2)})`);
  why.push(`Volatility: ${volRegime} (ATR: ${currentAtr.toFixed(2)})`);
  if (sr.supports.length > 0) why.push(`Nearest support: $${sr.supports[0]!.toFixed(2)}`);
  if (sr.resistances.length > 0) why.push(`Nearest resistance: $${sr.resistances[0]!.toFixed(2)}`);

  // --- Confidence scoring ---
  let confidence = 50;
  // Trend alignment
  if (trend.trend === 'strong_uptrend') confidence += 15;
  else if (trend.trend === 'uptrend') confidence += 8;
  else if (trend.trend === 'downtrend') confidence -= 8;
  else if (trend.trend === 'strong_downtrend') confidence -= 15;
  // RSI signal
  if (currentRsi < 35) confidence += 10; // oversold bounce potential
  else if (currentRsi > 65) confidence -= 10;
  // MACD crossover
  if (macdCrossover) confidence += 10;
  if (macdCrossunder) confidence -= 10;
  // Bollinger position
  if (currentBb && lastClose < currentBb.lower) confidence += 5;
  if (currentBb && lastClose > currentBb.upper) confidence -= 5;
  // Clamp
  confidence = Math.max(0, Math.min(100, confidence));

  // --- Verdict ---
  let verdict: Verdict;
  if (confidence >= 65) verdict = 'BUY';
  else if (confidence <= 35) verdict = 'SELL';
  else verdict = 'WAIT';

  // --- Position sizing (only for BUY/SELL) ---
  let how: ThinkResult['how'];
  if (verdict === 'BUY' || verdict === 'SELL') {
    const stopDistance = currentAtr * 2 * volMult;
    const stopLoss = verdict === 'BUY' ? lastClose - stopDistance : lastClose + stopDistance;
    const takeProfit = verdict === 'BUY'
      ? lastClose + stopDistance * 2.2
      : lastClose - stopDistance * 2.2;

    const sizing = fixedPercentageSize({
      portfolioValue,
      riskPct,
      entryPrice: lastClose,
      stopLossPrice: stopLoss,
      maxPositionPct: 25,
    });

    const rr = calculateRiskReward({
      entryPrice: lastClose,
      stopLossPrice: stopLoss,
      takeProfitPrice: takeProfit,
    });

    how = {
      venue,
      size: `$${sizing.positionValue.toFixed(0)} (${riskPct}% risk)`,
      entry: Math.round(lastClose * 100) / 100,
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(takeProfit * 100) / 100,
      riskReward: `${rr.ratio.toFixed(1)}:1`,
      leverage: `${leverage}x`,
    };
  }

  // --- Risks ---
  const risks: string[] = [];
  if (volRegime === 'high' || volRegime === 'extreme') {
    risks.push(`${volRegime} volatility — wider stops needed, smaller size recommended`);
  }
  if (leverage > 1) {
    const liqPrice = calculateLiquidationPrice({
      entryPrice: lastClose,
      leverage,
      isLong: verdict === 'BUY',
      maintenanceMarginRate: 0.005,
    });
    risks.push(`Liquidation at $${liqPrice.toFixed(2)} (${leverage}x leverage)`);
  }
  if (trend.trend === 'downtrend' || trend.trend === 'strong_downtrend') {
    risks.push('Macro trend is bearish — counter-trend entry');
  }
  if (risks.length === 0) {
    risks.push('Standard market risk — always use stop-loss');
  }

  return { symbol, verdict, confidence, why, how, risks };
}
```

**Step 4: Run test to verify it passes**

Run: `cd skills/lucid-trade && npx vitest run src/brain/analysis.test.ts`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add src/brain/analysis.ts src/brain/analysis.test.ts
git commit -m "feat(trade): add brain analysis engine wiring indicators+trend+risk"
```

---

## Task 3: Brain MCP Tools (7 tools)

Register the 7 brain tools as MCP tools, replacing the 10 TA tools as the primary interface.

**Files:**
- Create: `src/brain/tools.ts`
- Create: `src/brain/tools.test.ts`
- Create: `src/brain/index.ts`
- Modify: `src/tools/index.ts` (add brain tools to createAllTools)

**Step 1: Write the failing test**

```typescript
// src/brain/tools.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createBrainTools } from './tools.js';
import { AdapterRegistry } from '../adapters/registry.js';
import type { IExchangeAdapter } from '../adapters/types.js';
import type { OHLCV, ExchangeId } from '../types/index.js';
import type { ToolDefinition } from '../tools/index.js';

// Minimal mock adapter
function makeMockAdapter(): IExchangeAdapter {
  const candles: OHLCV[] = Array.from({ length: 60 }, (_, i) => ({
    timestamp: Date.now() - (60 - i) * 3600_000,
    open: 100 + i * 0.5,
    high: 102 + i * 0.5,
    low: 98 + i * 0.5,
    close: 101 + i * 0.5,
    volume: 1000,
  }));

  return {
    exchangeId: 'hyperliquid' as ExchangeId,
    capabilities: new Set(['spot', 'perps']) as any,
    getCandles: async () => candles,
    getTicker: async () => ({ symbol: 'SOL/USDT', last: 130, bid: 129.9, ask: 130.1, volume24h: 5000000, change24h: 2.5, high24h: 132, low24h: 126, timestamp: Date.now() }),
    getPrice: async () => ({ symbol: 'SOL/USDT', price: 130, timestamp: Date.now() }),
    getOrderbook: async () => ({ bids: [], asks: [], timestamp: Date.now() }),
    getRecentTrades: async () => [],
    getInstruments: async () => [{ symbol: 'SOL/USDT', baseAsset: 'SOL', quoteAsset: 'USDT', exchangeId: 'hyperliquid' as ExchangeId, assetType: 'perpetual' as any, minSize: 0.01, tickSize: 0.01, active: true }],
  };
}

describe('brain tools', () => {
  let tools: ToolDefinition[];
  let registry: AdapterRegistry;

  beforeAll(() => {
    registry = new AdapterRegistry();
    registry.register(makeMockAdapter());
    tools = createBrainTools({ registry, portfolioValue: 10000, riskPct: 2 });
  });

  it('creates exactly 7 tools', () => {
    expect(tools).toHaveLength(7);
  });

  it('tool names match brain convention', () => {
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'lucid_execute',
      'lucid_pro',
      'lucid_protect',
      'lucid_review',
      'lucid_scan',
      'lucid_think',
      'lucid_watch',
    ]);
  });

  describe('lucid_think', () => {
    it('returns formatted analysis with verdict and confidence', async () => {
      const think = tools.find((t) => t.name === 'lucid_think')!;
      const result = await think.execute({ query: 'analyze SOL on hyperliquid' });
      expect(result).toContain('SOL');
      expect(result).toMatch(/BUY|SELL|WAIT|CLOSE/);
      expect(result).toContain('WHY:');
      expect(result).toContain('RISKS:');
    });
  });

  describe('lucid_scan', () => {
    it('returns scan results for available exchanges', async () => {
      const scan = tools.find((t) => t.name === 'lucid_scan')!;
      const result = await scan.execute({ criteria: 'oversold altcoins' });
      expect(result).toContain('Scan:');
    });
  });

  describe('lucid_pro', () => {
    it('lists available pro tools when called with list_tools', async () => {
      const pro = tools.find((t) => t.name === 'lucid_pro')!;
      const result = await pro.execute({ tool: 'list_tools' });
      expect(result).toContain('ta_analyze');
      expect(result).toContain('ta_get_rsi');
    });

    it('executes a pro tool directly', async () => {
      const pro = tools.find((t) => t.name === 'lucid_pro')!;
      const result = await pro.execute({
        tool: 'ta_get_rsi',
        params: { exchange: 'hyperliquid', symbol: 'SOL/USDT', timeframe: '4h', limit: 60 },
      });
      expect(result).toContain('rsi');
    });
  });

  describe('lucid_protect', () => {
    it('returns risk check with overall level', async () => {
      const protect = tools.find((t) => t.name === 'lucid_protect')!;
      const result = await protect.execute({});
      expect(result).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/);
    });
  });

  describe('lucid_review', () => {
    it('returns performance review', async () => {
      const review = tools.find((t) => t.name === 'lucid_review')!;
      const result = await review.execute({});
      expect(result).toContain('Performance Review');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd skills/lucid-trade && npx vitest run src/brain/tools.test.ts`
Expected: FAIL — module not found

**Step 3: Implement brain tools**

```typescript
// src/brain/tools.ts
import type { ToolDefinition, ToolDependencies } from '../tools/index.js';
import type { AdapterRegistry } from '../adapters/registry.js';
import { runAnalysis } from './analysis.js';
import { formatThinkResult, formatScanResult, formatProtectResult, formatReviewResult } from './formatter.js';
import { createTaTools } from '../tools/technical-analysis.js';
import type { ExchangeId, Timeframe } from '../types/index.js';

export interface BrainDeps {
  registry: AdapterRegistry;
  portfolioValue: number;
  riskPct: number;
}

/** Parse exchange and symbol from a natural language query */
function parseQuery(query: string, exchanges: string[]): { exchange?: string; symbol?: string; timeframe: string } {
  const q = query.toLowerCase();

  // Find exchange mention
  let exchange: string | undefined;
  for (const ex of exchanges) {
    if (q.includes(ex.toLowerCase())) { exchange = ex; break; }
  }

  // Find symbol (look for common patterns: SOL, BTC/USDT, ETH, etc.)
  const symbolMatch = q.match(/\b([A-Z]{2,10})(\/[A-Z]{2,6})?\b/i);
  let symbol = symbolMatch ? symbolMatch[0].toUpperCase() : undefined;
  if (symbol && !symbol.includes('/')) symbol = `${symbol}/USDT`;

  // Find timeframe
  const tfMatch = q.match(/\b(\d+[mhd]|1[wM])\b/);
  const timeframe = tfMatch ? tfMatch[1]! : '4h';

  return { exchange, symbol, timeframe };
}

export function createBrainTools(deps: BrainDeps): ToolDefinition[] {
  const { registry, portfolioValue, riskPct } = deps;
  const proTools = createTaTools(registry);

  // ---------- lucid_think ----------
  const think: ToolDefinition = {
    name: 'lucid_think',
    description: 'Deep analysis of any crypto asset. Returns verdict (BUY/SELL/WAIT), confidence score, reasoning, position sizing, and risks. Example: "analyze SOL for swing trade on hyperliquid"',
    params: {
      query: { type: 'string', required: true, description: 'Natural language query, e.g. "Should I buy SOL?" or "analyze ETH on 4h"' },
    },
    execute: async (p: Record<string, unknown>) => {
      const query = String(p.query || '');
      const exchanges = registry.list().map((a) => a.exchangeId);
      const parsed = parseQuery(query, exchanges);

      if (!parsed.symbol) return 'Could not identify a symbol in your query. Try: "analyze SOL" or "should I buy BTC?"';

      const exchange = parsed.exchange || exchanges[0];
      if (!exchange) return 'No exchange configured. Register an exchange adapter first.';

      const adapter = registry.get(exchange as ExchangeId);
      if (!adapter) return `Exchange "${exchange}" not found.`;

      const candles = await adapter.getCandles({
        exchange: exchange as ExchangeId,
        symbol: parsed.symbol,
        timeframe: parsed.timeframe as Timeframe,
        limit: 60,
      });

      const result = runAnalysis({
        symbol: parsed.symbol,
        candles,
        portfolioValue,
        riskPct,
        venue: exchange,
      });

      return formatThinkResult(result);
    },
  };

  // ---------- lucid_scan ----------
  const scan: ToolDefinition = {
    name: 'lucid_scan',
    description: 'Scan for trading opportunities across all configured exchanges. Returns ranked list of assets matching your criteria. Example: "find oversold altcoins" or "breakout setups on high volume"',
    params: {
      criteria: { type: 'string', required: true, description: 'What to scan for, e.g. "oversold altcoins", "breakout setups"' },
    },
    execute: async (p: Record<string, unknown>) => {
      const criteria = String(p.criteria || '');
      const adapters = registry.list();
      if (adapters.length === 0) return 'No exchanges configured. Register an exchange adapter to scan.';

      // For now, scan first adapter's instruments
      const instruments = await adapters[0]!.getInstruments();
      const matches: Array<{ symbol: string; exchange: string; signal: string; confidence: number }> = [];

      // Scan up to 10 instruments
      const toScan = instruments.slice(0, 10);
      for (const inst of toScan) {
        try {
          const candles = await adapters[0]!.getCandles({
            exchange: adapters[0]!.exchangeId,
            symbol: inst.symbol,
            timeframe: '4h' as Timeframe,
            limit: 60,
          });
          const analysis = runAnalysis({ symbol: inst.symbol, candles, portfolioValue, riskPct });
          if (analysis.confidence >= 60) {
            matches.push({
              symbol: inst.symbol,
              exchange: adapters[0]!.exchangeId,
              signal: analysis.verdict === 'BUY' ? 'bullish setup' : 'bearish setup',
              confidence: analysis.confidence,
            });
          }
        } catch { /* skip instruments that fail */ }
      }

      matches.sort((a, b) => b.confidence - a.confidence);

      return formatScanResult({
        criteria,
        matches,
        scannedExchanges: adapters.map((a) => a.exchangeId),
        scannedPairs: toScan.length,
      });
    },
  };

  // ---------- lucid_execute ----------
  const execute: ToolDefinition = {
    name: 'lucid_execute',
    description: 'Execute a trade. Validates against risk limits, calculates optimal sizing, and places the order. Example: "open 2% long SOL at market" or "close my ETH position"',
    params: {
      action: { type: 'string', required: true, description: 'Trade action, e.g. "open 2% long SOL at market"' },
    },
    execute: async (p: Record<string, unknown>) => {
      const action = String(p.action || '');
      // Phase 1: execution is deferred until exchange adapters have placeOrder()
      return `Execute requested: "${action}"\n\nExecution is not yet available — exchange adapters with order placement will be added in the next phase. Use lucid_think to get the recommended position sizing and parameters.`;
    },
  };

  // ---------- lucid_watch ----------
  const watch: ToolDefinition = {
    name: 'lucid_watch',
    description: 'Set up price alerts and monitoring. Example: "alert me if BTC drops below 60k" or "notify if any position hits -5%"',
    params: {
      what: { type: 'string', required: true, description: 'What to watch, e.g. "BTC below 60000" or "portfolio drawdown > 5%"' },
    },
    execute: async (p: Record<string, unknown>) => {
      const what = String(p.what || '');
      return `Watch requested: "${what}"\n\nAlert system will be available when persistence layer (Supabase) is configured. For now, use lucid_think to check current conditions.`;
    },
  };

  // ---------- lucid_protect ----------
  const protect: ToolDefinition = {
    name: 'lucid_protect',
    description: 'Check all risk exposure across your positions and exchanges. No parameters needed — the brain knows what to check. Returns risk level (LOW/MEDIUM/HIGH/CRITICAL) with detailed checks.',
    params: {},
    execute: async () => {
      const adapters = registry.list();
      const checks: Array<{ name: string; status: 'ok' | 'warning' | 'danger'; detail: string }> = [];

      if (adapters.length === 0) {
        return formatProtectResult({
          overallRisk: 'LOW',
          checks: [{ name: 'No exchanges', status: 'ok', detail: 'No exchanges configured — no positions to protect.' }],
        });
      }

      // Check each adapter for positions (if supported)
      for (const adapter of adapters) {
        if (adapter.getPositions) {
          try {
            const positions = await adapter.getPositions();
            if (positions.length === 0) {
              checks.push({ name: `${adapter.exchangeId} positions`, status: 'ok', detail: 'No open positions' });
            } else {
              const totalExposure = positions.reduce((sum, pos) => sum + Math.abs(pos.notionalValue ?? pos.size * pos.markPrice), 0);
              const leverageWarning = positions.some((p) => (p.leverage ?? 1) > 10);
              checks.push({
                name: `${adapter.exchangeId} exposure`,
                status: leverageWarning ? 'danger' : totalExposure > portfolioValue * 0.5 ? 'warning' : 'ok',
                detail: `${positions.length} positions, $${totalExposure.toFixed(0)} exposure${leverageWarning ? ' — HIGH LEVERAGE detected' : ''}`,
              });
            }
          } catch {
            checks.push({ name: `${adapter.exchangeId}`, status: 'warning', detail: 'Could not fetch positions (auth may be required)' });
          }
        } else {
          checks.push({ name: `${adapter.exchangeId}`, status: 'ok', detail: 'No position tracking available (market data only)' });
        }
      }

      if (checks.length === 0) {
        checks.push({ name: 'No data', status: 'ok', detail: 'No position data available' });
      }

      const hasDanger = checks.some((c) => c.status === 'danger');
      const hasWarning = checks.some((c) => c.status === 'warning');
      const overallRisk = hasDanger ? 'HIGH' as const : hasWarning ? 'MEDIUM' as const : 'LOW' as const;

      return formatProtectResult({ overallRisk, checks });
    },
  };

  // ---------- lucid_review ----------
  const review: ToolDefinition = {
    name: 'lucid_review',
    description: 'Review your trading performance. Returns win rate, PnL, Sharpe ratio, best/worst setups, and improvement suggestions.',
    params: {},
    execute: async () => {
      // Phase 1: no persistence — return placeholder with explanation
      return formatReviewResult({
        period: '30d',
        totalPnl: 'N/A',
        winRate: 'N/A',
        sharpe: 0,
        bestSetup: 'Not enough data',
        worstSetup: 'Not enough data',
        suggestion: 'Performance tracking requires the memory layer (Supabase). Once configured, every trade outcome is recorded and the brain learns your edge over time.',
      });
    },
  };

  // ---------- lucid_pro ----------
  const pro: ToolDefinition = {
    name: 'lucid_pro',
    description: 'Pro mode — direct access to granular tools. Call lucid_pro with tool="list_tools" to see all available tools, or pass a specific tool name and params. Example: lucid_pro(tool="ta_get_rsi", params={symbol:"SOL/USDT", exchange:"hyperliquid"})',
    params: {
      tool: { type: 'string', required: true, description: 'Tool name to execute, or "list_tools" to see all available' },
      params: { type: 'object', required: false, description: 'Parameters to pass to the tool' },
    },
    execute: async (p: Record<string, unknown>) => {
      const toolName = String(p.tool || '');

      if (toolName === 'list_tools') {
        const lines = ['Available pro tools:'];
        for (const t of proTools) {
          lines.push(`  ${t.name} — ${t.description}`);
        }
        return lines.join('\n');
      }

      const target = proTools.find((t) => t.name === toolName);
      if (!target) {
        return `Unknown tool "${toolName}". Call lucid_pro with tool="list_tools" to see available tools.`;
      }

      const toolParams = (p.params ?? {}) as Record<string, unknown>;
      return target.execute(toolParams);
    },
  };

  return [think, scan, execute, watch, protect, review, pro];
}
```

```typescript
// src/brain/index.ts
export { createBrainTools } from './tools.js';
export type { BrainDeps } from './tools.js';
export { runAnalysis } from './analysis.js';
export type { AnalysisParams } from './analysis.js';
export { formatThinkResult, formatScanResult, formatProtectResult, formatReviewResult } from './formatter.js';
export type {
  ThinkResult, ScanResult, ScanItem, ExecuteResult,
  WatchResult, ProtectResult, ProtectCheck, ReviewResult,
  Verdict, BrainContext,
} from './types.js';
```

**Step 4: Modify `src/tools/index.ts` to include brain tools**

Replace `createAllTools` to expose brain tools as the primary interface:

```typescript
// src/tools/index.ts — UPDATED
import type { PluginConfig } from '../config.js';
import type { AdapterRegistry } from '../adapters/registry.js';
import { createTaTools } from './technical-analysis.js';
import { createBrainTools } from '../brain/tools.js';

// ... keep existing type definitions (ToolParamDef, ToolDefinition, etc.) ...

export interface ToolDependencies {
  config: PluginConfig;
  registry: AdapterRegistry;
}

/**
 * Instantiate every tool the trade MCP exposes.
 *
 * Primary interface: 7 brain tools (lucid_think, lucid_scan, etc.)
 * Pro tools (ta_*) are accessible via lucid_pro escape hatch.
 */
export function createAllTools(deps: ToolDependencies): ToolDefinition[] {
  return [
    ...createBrainTools({
      registry: deps.registry,
      portfolioValue: 10000,  // default, overridden by memory layer later
      riskPct: 2,             // default, overridden by memory layer later
    }),
  ];
}

/** Create only the granular TA tools (used by pro mode internally) */
export function createProTools(registry: AdapterRegistry): ToolDefinition[] {
  return createTaTools(registry);
}
```

**Step 5: Run ALL tests to verify nothing broke**

Run: `cd skills/lucid-trade && npx vitest run`
Expected: All previous 97 tests PASS + new brain tests PASS

**Step 6: Commit**

```bash
git add src/brain/tools.ts src/brain/tools.test.ts src/brain/index.ts src/tools/index.ts
git commit -m "feat(trade): add 7 brain MCP tools (think/scan/execute/watch/protect/review/pro)"
```

---

## Task 4: Trade Domain Adapter Export

Export a duck-typed `tradeDomain` object for future brain SDK integration.

**Files:**
- Create: `src/domain.ts`
- Create: `src/domain.test.ts`
- Modify: `src/index.ts` (add export)

**Step 1: Write the failing test**

```typescript
// src/domain.test.ts
import { describe, it, expect } from 'vitest';
import { tradeDomain } from './domain.js';

describe('tradeDomain adapter', () => {
  it('has correct id and name', () => {
    expect(tradeDomain.id).toBe('trade');
    expect(tradeDomain.name).toBe('Crypto Trading Intelligence');
  });

  it('canHandle returns high confidence for trading intents', () => {
    expect(tradeDomain.canHandle('analyze SOL')).toBeGreaterThan(70);
    expect(tradeDomain.canHandle('should I buy BTC?')).toBeGreaterThan(70);
    expect(tradeDomain.canHandle('open long ETH')).toBeGreaterThan(70);
    expect(tradeDomain.canHandle('what is my PnL')).toBeGreaterThan(50);
  });

  it('canHandle returns low confidence for non-trading intents', () => {
    expect(tradeDomain.canHandle('audit this smart contract')).toBeLessThan(30);
    expect(tradeDomain.canHandle('write a poem')).toBeLessThan(20);
    expect(tradeDomain.canHandle('check my Sentry errors')).toBeLessThan(20);
  });

  it('has all 6 brain methods', () => {
    expect(typeof tradeDomain.think).toBe('function');
    expect(typeof tradeDomain.scan).toBe('function');
    expect(typeof tradeDomain.execute).toBe('function');
    expect(typeof tradeDomain.watch).toBe('function');
    expect(typeof tradeDomain.protect).toBe('function');
    expect(typeof tradeDomain.review).toBe('function');
  });

  it('has proTools array', () => {
    expect(Array.isArray(tradeDomain.proTools)).toBe(true);
    expect(tradeDomain.proTools.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd skills/lucid-trade && npx vitest run src/domain.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the domain adapter**

```typescript
// src/domain.ts
import { AdapterRegistry } from './adapters/registry.js';
import { createBrainTools } from './brain/tools.js';
import { createTaTools } from './tools/technical-analysis.js';

const TRADE_KEYWORDS = [
  'buy', 'sell', 'long', 'short', 'trade', 'position', 'pnl', 'p&l',
  'portfolio', 'margin', 'leverage', 'liquidation', 'stop.?loss', 'take.?profit',
  'entry', 'exit', 'breakout', 'oversold', 'overbought', 'rsi', 'macd',
  'bollinger', 'moving.?average', 'candle', 'chart', 'price', 'volume',
  'funding', 'open.?interest', 'orderbook', 'bid', 'ask', 'spread',
  'sol', 'btc', 'eth', 'bitcoin', 'ethereum', 'solana', 'altcoin',
  'crypto', 'perp', 'swap', 'futures', 'spot',
  'hyperliquid', 'binance', 'dydx', 'drift', 'gmx', 'jupiter',
  'backtest', 'kelly', 'sharpe', 'drawdown', 'risk.?reward',
  'dca', 'grid', 'scalp', 'swing', 'whale', 'smart.?money',
];

const TRADE_REGEX = new RegExp(TRADE_KEYWORDS.join('|'), 'i');

export const tradeDomain = {
  id: 'trade' as const,
  name: 'Crypto Trading Intelligence',
  version: '5.0.0',

  canHandle(intent: string): number {
    const matches = intent.match(new RegExp(TRADE_KEYWORDS.join('|'), 'gi'));
    if (!matches) return 5; // baseline for unknown
    // More keyword matches = higher confidence
    const score = Math.min(95, 30 + matches.length * 15);
    return score;
  },

  // Brain methods delegate to brain tools (stateless for now)
  // When brain SDK exists, these receive BrainContext with memory
  async think(params: { query: string }, ctx?: any) {
    const registry = ctx?.registry ?? new AdapterRegistry();
    const tools = createBrainTools({ registry, portfolioValue: ctx?.portfolioValue ?? 10000, riskPct: ctx?.riskPct ?? 2 });
    const thinkTool = tools.find((t) => t.name === 'lucid_think')!;
    return thinkTool.execute({ query: params.query });
  },

  async scan(params: { criteria: string }, ctx?: any) {
    const registry = ctx?.registry ?? new AdapterRegistry();
    const tools = createBrainTools({ registry, portfolioValue: ctx?.portfolioValue ?? 10000, riskPct: ctx?.riskPct ?? 2 });
    const scanTool = tools.find((t) => t.name === 'lucid_scan')!;
    return scanTool.execute({ criteria: params.criteria });
  },

  async execute(params: { action: string }, ctx?: any) {
    const registry = ctx?.registry ?? new AdapterRegistry();
    const tools = createBrainTools({ registry, portfolioValue: ctx?.portfolioValue ?? 10000, riskPct: ctx?.riskPct ?? 2 });
    const execTool = tools.find((t) => t.name === 'lucid_execute')!;
    return execTool.execute({ action: params.action });
  },

  async watch(params: { what: string }, ctx?: any) {
    const registry = ctx?.registry ?? new AdapterRegistry();
    const tools = createBrainTools({ registry, portfolioValue: ctx?.portfolioValue ?? 10000, riskPct: ctx?.riskPct ?? 2 });
    const watchTool = tools.find((t) => t.name === 'lucid_watch')!;
    return watchTool.execute({ what: params.what });
  },

  async protect(ctx?: any) {
    const registry = ctx?.registry ?? new AdapterRegistry();
    const tools = createBrainTools({ registry, portfolioValue: ctx?.portfolioValue ?? 10000, riskPct: ctx?.riskPct ?? 2 });
    const protectTool = tools.find((t) => t.name === 'lucid_protect')!;
    return protectTool.execute({});
  },

  async review(ctx?: any) {
    const registry = ctx?.registry ?? new AdapterRegistry();
    const tools = createBrainTools({ registry, portfolioValue: ctx?.portfolioValue ?? 10000, riskPct: ctx?.riskPct ?? 2 });
    const reviewTool = tools.find((t) => t.name === 'lucid_review')!;
    return reviewTool.execute({});
  },

  // Pro tools for granular access
  get proTools() {
    return createTaTools(new AdapterRegistry());
  },
};
```

**Step 4: Add export to `src/index.ts`**

Add after the existing exports:

```typescript
// Domain adapter (for brain SDK integration)
export { tradeDomain } from './domain.js';
```

**Step 5: Run ALL tests**

Run: `cd skills/lucid-trade && npx vitest run`
Expected: All tests PASS (97 existing + new brain + domain tests)

**Step 6: Commit**

```bash
git add src/domain.ts src/domain.test.ts src/index.ts
git commit -m "feat(trade): add TradeDomainAdapter for brain SDK integration"
```

---

## Task 5: Update MCP Server & OpenClaw Registration

Update the MCP server and OpenClaw registration to expose brain tools instead of raw TA tools.

**Files:**
- Modify: `src/mcp.ts`
- Modify: `src/openclaw.ts`
- Modify: `src/plugin-id.ts`

**Step 1: Update `src/plugin-id.ts`**

```typescript
export const PLUGIN_DESCRIPTION =
  'Lucid Brain — 7 smart trading tools powered by TA, risk engine, and backtesting intelligence. Ask, don\'t configure.' as const;
```

**Step 2: Verify MCP server still works**

Run: `cd skills/lucid-trade && npx vitest run`
Expected: All tests PASS

The MCP server (`mcp.ts`) already calls `createAllTools`, which now returns brain tools. The OpenClaw registration (`openclaw.ts`) also calls `createAllTools`. Both automatically get the 7 brain tools.

**Step 3: Commit**

```bash
git add src/plugin-id.ts
git commit -m "feat(trade): update plugin description for brain architecture"
```

---

## Task 6: Update Barrel Exports & Typecheck

Ensure all new modules are exported and the project typechecks.

**Files:**
- Modify: `src/index.ts` (add brain exports)
- Run: `tsc --noEmit`

**Step 1: Update `src/index.ts`**

Add brain exports:

```typescript
// Brain layer
export { createBrainTools, runAnalysis } from './brain/index.js';
export type {
  ThinkResult, ScanResult, ScanItem, ExecuteResult,
  WatchResult, ProtectResult, ProtectCheck, ReviewResult,
  Verdict, BrainContext, AnalysisParams, BrainDeps,
} from './brain/index.js';
```

**Step 2: Run typecheck**

Run: `cd skills/lucid-trade && npx tsc --noEmit`
Expected: No errors

**Step 3: Run all tests one final time**

Run: `cd skills/lucid-trade && npx vitest run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat(trade): export brain layer from barrel + typecheck clean"
```

---

## Summary

| Task | What | New Files | Tests Added |
|------|------|-----------|-------------|
| 1 | Brain types + response formatters | `brain/types.ts`, `brain/formatter.ts` | ~5 |
| 2 | Analysis engine (wires intelligence) | `brain/analysis.ts` | ~4 |
| 3 | 7 brain MCP tools + pro escape hatch | `brain/tools.ts`, `brain/index.ts` | ~7 |
| 4 | TradeDomainAdapter | `domain.ts` | ~5 |
| 5 | Update plugin description | `plugin-id.ts` | 0 |
| 6 | Barrel exports + typecheck | `index.ts` | 0 |

**Expected final state:** ~118+ tests passing (97 existing + ~21 new), 7 brain tools as primary MCP interface, 10 TA tools accessible via `lucid_pro`, TradeDomainAdapter ready for brain SDK.
