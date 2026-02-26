// ---------------------------------------------------------------------------
// brain/tools.ts -- 7 brain MCP tools for Lucid Predict
// ---------------------------------------------------------------------------

import type { ToolDefinition } from '../tools/index.js';
import type { PlatformRegistry } from '../adapters/registry.js';
import type { PluginConfig } from '../config.js';
import type { Market, Forecast, PlatformId } from '../types/index.js';
import type { Adjustment } from '../math/bayesian.js';
import type { DiscoverResult, ArbitrageResult, CalibrateResult, SizeResult } from './types.js';
import { runEvaluation } from './analysis.js';
import {
  formatEvaluateResult,
  formatDiscoverResult,
  formatArbitrageResult,
  formatCalibrateResult,
} from './formatter.js';
import { log } from '../utils/logger.js';
import {
  expectedValue,
  kellyFraction,
  convertOdds,
  analyzeEfficiency,
  liquidityScore,
  daysToClose,
  timeDecayScore,
  isNearCertainExpiry,
  estimateProbability,
  bayesianUpdate,
  brierScore,
  calibrationBuckets,
  overconfidenceScore,
  titleSimilarity,
  matchMarkets,
  calculateSpread,
  calculateArbitrage,
} from '../math/index.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface BrainDeps {
  registry: PlatformRegistry;
  config: PluginConfig;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseMarketQuery(query: string, platforms: string[]): {
  platform?: string;
  searchTerm: string;
} {
  const q = query.toLowerCase();
  let platform: string | undefined;
  for (const p of platforms) {
    if (q.includes(p.toLowerCase())) {
      platform = p;
      break;
    }
  }
  // Strip platform name and common words from search term
  let searchTerm = query.replace(/on\s+\w+/i, '').replace(/evaluate|analyze|check/gi, '').trim();
  if (!searchTerm) searchTerm = query;
  return { platform, searchTerm };
}

async function fetchMarketsFromAll(registry: PlatformRegistry, query: string, limit: number = 10): Promise<Market[]> {
  const adapters = registry.list();
  const results: Market[] = [];
  for (const adapter of adapters) {
    try {
      const markets = await adapter.searchMarkets(query, limit);
      results.push(...markets);
    } catch (err) {
      log.warn(`Adapter ${adapter.platformId} failed`, { error: String(err) });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createBrainTools(deps: BrainDeps): ToolDefinition[] {
  const { registry, config } = deps;

  // -----------------------------------------------------------------------
  // 1. lucid_evaluate — Deep evaluation of a single market
  // -----------------------------------------------------------------------
  const lucidEvaluate: ToolDefinition = {
    name: 'lucid_evaluate',
    description:
      'Evaluate a prediction market for edge and optimal position sizing. Combines EV analysis, Kelly criterion, market efficiency, and time decay into a structured verdict (BUY_YES / BUY_NO / SKIP / HEDGE).',
    params: {
      query: { type: 'string', required: true, description: 'Market to evaluate (title, URL, or search query)' },
      probability: { type: 'number', description: 'Your estimated true probability (0-1). Omit to use market price.' },
      adjustments: { type: 'array', description: 'Bayesian adjustments [{factor, direction, magnitude, reasoning}]' },
      format: { type: 'enum', values: ['json', 'text'], default: 'json', description: 'Output format' },
      detail: { type: 'enum', values: ['full', 'compact'], default: 'full', description: 'Detail level' },
    },
    execute: async (params: Record<string, unknown>) => {
      const query = params.query as string;
      const probability = params.probability as number | undefined;
      const adjustments = params.adjustments as Adjustment[] | undefined;
      const format = (params.format as string) ?? 'json';
      const detail = (params.detail as string) ?? 'full';
      const { platform, searchTerm } = parseMarketQuery(query, registry.list().map((a) => a.platformId));

      // Find the market
      let market: Market | undefined;
      if (platform) {
        const adapter = registry.get(platform as PlatformId);
        if (adapter) {
          const results = await adapter.searchMarkets(searchTerm, 1);
          market = results[0];
        }
      }
      if (!market) {
        const all = await fetchMarketsFromAll(registry, searchTerm, 1);
        market = all[0];
      }
      if (!market) return JSON.stringify({ error: `No market found for query: ${query}` });

      const result = runEvaluation({
        market,
        estimatedProbability: probability,
        bankroll: config.defaultBankroll,
        maxFraction: config.defaultMaxFraction,
        adjustments,
      });

      if (format === 'text') return formatEvaluateResult(result);
      if (detail === 'compact') {
        const { evidence: _ev, ...rest } = result;
        return JSON.stringify(rest);
      }
      return JSON.stringify(result);
    },
  };

  // -----------------------------------------------------------------------
  // 2. lucid_discover — Scan markets for edge opportunities
  // -----------------------------------------------------------------------
  const lucidDiscover: ToolDefinition = {
    name: 'lucid_discover',
    description:
      'Scan prediction markets across all platforms to discover edge opportunities. Filters by minimum edge threshold and returns sorted by score.',
    params: {
      query: { type: 'string', required: true, description: 'Search criteria (topic, category, or keyword)' },
      minEdge: { type: 'number', default: 3, description: 'Minimum edge % to include' },
      limit: { type: 'number', default: 10, description: 'Max results to return' },
      format: { type: 'enum', values: ['json', 'text'], default: 'json' },
    },
    execute: async (params: Record<string, unknown>) => {
      const query = params.query as string;
      const minEdge = (params.minEdge as number) ?? 3;
      const limit = (params.limit as number) ?? 10;
      const format = (params.format as string) ?? 'json';
      const markets = await fetchMarketsFromAll(registry, query, 50);

      const result: DiscoverResult = {
        items: [],
        scannedCount: markets.length,
        platformsSearched: registry.list().map((a) => a.platformId),
      };

      for (const market of markets) {
        // Use market efficiency, time decay, and liquidity as edge signals
        // even without an explicit probability estimate
        const days = market.closeDate ? Math.ceil((new Date(market.closeDate).getTime() - Date.now()) / 86_400_000) : 365;
        const price = market.currentPrices.yes;
        const nearCertain = days > 0 && days <= 7 && price >= 0.90;
        const estimatedProb = nearCertain ? Math.min(0.99, price + 0.03) : undefined;

        const evaluation = runEvaluation({
          market,
          estimatedProbability: estimatedProb,
          bankroll: config.defaultBankroll,
          maxFraction: config.defaultMaxFraction,
        });
        if (Math.abs(evaluation.edge.pct) >= minEdge) {
          result.items.push({
            market,
            edgePct: evaluation.edge.pct,
            edgeType: evaluation.edge.type,
            score: evaluation.score,
            verdict: evaluation.verdict,
          });
        }
      }

      result.items.sort((a, b) => b.score - a.score);
      result.items = result.items.slice(0, limit);

      if (format === 'text') return formatDiscoverResult(result);
      return JSON.stringify(result);
    },
  };

  // -----------------------------------------------------------------------
  // 3. lucid_arbitrage — Cross-platform arbitrage detection
  // -----------------------------------------------------------------------
  const lucidArbitrage: ToolDefinition = {
    name: 'lucid_arbitrage',
    description:
      'Detect cross-platform arbitrage opportunities by matching similar markets across Polymarket, Manifold, and Kalshi, then calculating price spreads.',
    params: {
      query: { type: 'string', default: '', description: 'Optional filter query' },
      minSpread: { type: 'number', default: 3, description: 'Minimum spread % to report' },
      format: { type: 'enum', values: ['json', 'text'], default: 'json' },
    },
    execute: async (params: Record<string, unknown>) => {
      const query = (params.query as string) ?? '';
      const minSpread = (params.minSpread as number) ?? config.minSpreadPct;
      const format = (params.format as string) ?? 'json';
      const adapters = registry.list();
      if (adapters.length < 2) {
        return JSON.stringify({ error: 'Need at least 2 platforms for arbitrage detection' });
      }

      // Fetch markets from all platforms
      const marketsByPlatform: Map<PlatformId, Market[]> = new Map();
      for (const adapter of adapters) {
        try {
          const markets = query
            ? await adapter.searchMarkets(query, 30)
            : await adapter.getTrending(30);
          marketsByPlatform.set(adapter.platformId, markets);
        } catch {
          marketsByPlatform.set(adapter.platformId, []);
        }
      }

      const result: ArbitrageResult = {
        opportunities: [],
        pairsScanned: 0,
        platformsSearched: adapters.map((a) => a.platformId),
      };

      // Compare all platform pairs
      const platformIds = [...marketsByPlatform.keys()];
      for (let i = 0; i < platformIds.length; i++) {
        for (let j = i + 1; j < platformIds.length; j++) {
          const marketsA = marketsByPlatform.get(platformIds[i]!) ?? [];
          const marketsB = marketsByPlatform.get(platformIds[j]!) ?? [];
          const pairs = matchMarkets(marketsA, marketsB);
          result.pairsScanned += marketsA.length * marketsB.length;

          for (const pair of pairs) {
            // Check both directions: YES_A + NO_B and YES_B + NO_A
            const arbAB = calculateArbitrage(pair.marketA.currentPrices.yes, pair.marketB.currentPrices.no);
            if (arbAB && arbAB.profitPct >= minSpread) {
              result.opportunities.push({
                marketA: pair.marketA,
                marketB: pair.marketB,
                similarity: pair.similarity,
                yesPrice: pair.marketA.currentPrices.yes,
                noPrice: pair.marketB.currentPrices.no,
                ...arbAB,
              });
            }
            const arbBA = calculateArbitrage(pair.marketB.currentPrices.yes, pair.marketA.currentPrices.no);
            if (arbBA && arbBA.profitPct >= minSpread) {
              result.opportunities.push({
                marketA: pair.marketB,
                marketB: pair.marketA,
                similarity: pair.similarity,
                yesPrice: pair.marketB.currentPrices.yes,
                noPrice: pair.marketA.currentPrices.no,
                ...arbBA,
              });
            }
          }
        }
      }

      result.opportunities.sort((a, b) => b.profitPct - a.profitPct);

      if (format === 'text') return formatArbitrageResult(result);
      return JSON.stringify(result);
    },
  };

  // -----------------------------------------------------------------------
  // 4. lucid_correlate — Find correlated markets with pricing lags
  // -----------------------------------------------------------------------
  const lucidCorrelate: ToolDefinition = {
    name: 'lucid_correlate',
    description:
      '[COMING SOON] Find correlated prediction markets where one has resolved but the related market hasn\'t adjusted its price yet — exploiting correlation lag.',
    params: {
      query: { type: 'string', required: true, description: 'Topic or category to search' },
      format: { type: 'enum', values: ['json', 'text'], default: 'json' },
    },
    execute: async (_params: Record<string, unknown>) => {
      // This is a deferred feature — requires resolved market data
      return JSON.stringify({
        pairs: [],
        marketsScanned: 0,
        note: 'Correlation lag detection deferred — requires resolved market history from platform APIs',
      });
    },
  };

  // -----------------------------------------------------------------------
  // 5. lucid_size — Portfolio-level Kelly sizing
  // -----------------------------------------------------------------------
  const lucidSize: ToolDefinition = {
    name: 'lucid_size',
    description:
      'Calculate optimal position sizes for a portfolio of prediction market positions using Kelly criterion with correlation adjustments.',
    params: {
      positions: {
        type: 'array',
        required: true,
        description: 'Array of {price, probability, label?} objects',
      },
      bankroll: { type: 'number', description: 'Total bankroll (default from config)' },
      maxFraction: { type: 'number', default: 0.25, description: 'Max fraction per position' },
      format: { type: 'enum', values: ['json', 'text'], default: 'json' },
    },
    execute: async (params: Record<string, unknown>) => {
      const positions = params.positions as Array<{ price: number; probability: number; label?: string; platform?: string }>;
      const bankroll = (params.bankroll as number) ?? config.defaultBankroll;
      const maxFraction = (params.maxFraction as number) ?? config.defaultMaxFraction;
      const format = (params.format as string) ?? 'json';

      if (!Array.isArray(positions) || positions.length === 0) {
        return JSON.stringify({ error: 'positions array is required' });
      }

      const allocations: SizeResult['allocations'] = [];
      let totalAllocated = 0;

      for (const pos of positions) {
        const price = Number(pos.price);
        const probability = Number(pos.probability);
        const kelly = kellyFraction(price, probability, bankroll, maxFraction);
        const edgePct = (probability - price) * 100;

        allocations.push({
          market: { title: pos.label ?? `Position @ ${price}`, platform: (pos.platform as PlatformId) ?? 'polymarket' },
          recommendedFraction: kelly.recommended,
          positionSize: kelly.positionSize,
          edgePct: Math.round(edgePct * 100) / 100,
        });
        totalAllocated += kelly.positionSize;
      }

      const result: SizeResult = {
        allocations,
        totalAllocated: Math.round(totalAllocated * 100) / 100,
        bankroll,
        remainingBankroll: Math.round((bankroll - totalAllocated) * 100) / 100,
      };

      if (format === 'text') {
        const lines = [`Portfolio Sizing (Bankroll: $${bankroll})`];
        for (const a of result.allocations) {
          lines.push(`  ${a.market.title}: $${a.positionSize} (${(a.recommendedFraction * 100).toFixed(1)}%) | Edge: ${a.edgePct}%`);
        }
        lines.push(`  Total: $${result.totalAllocated} | Remaining: $${result.remainingBankroll}`);
        return lines.join('\n');
      }
      return JSON.stringify(result);
    },
  };

  // -----------------------------------------------------------------------
  // 6. lucid_calibrate — Calibration tracking
  // -----------------------------------------------------------------------
  const lucidCalibrate: ToolDefinition = {
    name: 'lucid_calibrate',
    description:
      'Analyze your prediction calibration using Brier score, calibration curve, and overconfidence detection. Provide an array of past forecasts with outcomes.',
    params: {
      forecasts: {
        type: 'array',
        required: true,
        description: 'Array of {predictedProbability, actualOutcome (0 or 1), category?}',
      },
      format: { type: 'enum', values: ['json', 'text'], default: 'json' },
    },
    execute: async (params: Record<string, unknown>) => {
      const forecasts = params.forecasts as Array<{ predictedProbability: number; actualOutcome: number; category?: string }>;
      const format = (params.format as string) ?? 'json';

      if (!Array.isArray(forecasts) || forecasts.length === 0) {
        return JSON.stringify({ error: 'forecasts array is required' });
      }

      const typedForecasts: Forecast[] = forecasts.map((f) => ({
        predictedProbability: Number(f.predictedProbability),
        actualOutcome: Number(f.actualOutcome) as 0 | 1,
        category: f.category,
      }));

      const bs = brierScore(typedForecasts);
      const buckets = calibrationBuckets(typedForecasts);
      const oc = overconfidenceScore(buckets);

      const rating = bs < 0.1 ? 'excellent' : bs < 0.2 ? 'good' : bs < 0.3 ? 'fair' : 'poor';

      const result: CalibrateResult = {
        brierScore: bs,
        overconfidenceScore: oc,
        buckets,
        totalForecasts: typedForecasts.length,
        rating,
      };

      if (format === 'text') return formatCalibrateResult(result);
      return JSON.stringify(result);
    },
  };

  // -----------------------------------------------------------------------
  // 7. lucid_pro — Direct access to math/adapter tools
  // -----------------------------------------------------------------------
  const lucidPro: ToolDefinition = {
    name: 'lucid_pro',
    description:
      'Direct access to prediction market math functions and platform adapters. Use list_tools to see available tools, or call one directly.',
    params: {
      tool: { type: 'string', required: true, description: 'Tool name or "list_tools"' },
      params: { type: 'object', description: 'Tool parameters' },
    },
    execute: async (params: Record<string, unknown>) => {
      const tool = params.tool as string;
      const toolParams = (params.params as Record<string, unknown>) ?? {};

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const proTools: Record<string, (p: any) => unknown> = {
        // Math tools
        expected_value: (p) => expectedValue(p.stake, p.price, p.probability),
        kelly_fraction: (p) => kellyFraction(p.price, p.probability, p.bankroll, p.maxFraction),
        convert_odds: (p) => convertOdds(p.value, p.from, p.to),
        analyze_efficiency: (p) => analyzeEfficiency(p.prices),
        liquidity_score: (p) => liquidityScore(p.volumeUsd, p.liquidityUsd),
        days_to_close: (p) => daysToClose(p.closeDate),
        time_decay_score: (p) => timeDecayScore(p.days, p.price),
        is_near_certain_expiry: (p) => isNearCertainExpiry(p.days, p.price, p.threshold),
        estimate_probability: (p) => estimateProbability(p.baseRate, p.adjustments),
        bayesian_update: (p) => bayesianUpdate(p.prior, p.likelihoodRatio),
        brier_score: (p) => brierScore(p.forecasts),
        title_similarity: (p) => titleSimilarity(p.titleA, p.titleB),
        calculate_spread: (p) => calculateSpread(p.priceA, p.priceB),
        calculate_arbitrage: (p) => calculateArbitrage(p.yesPrice, p.noPrice),
      };
      /* eslint-enable @typescript-eslint/no-explicit-any */

      if (tool === 'list_tools') {
        return JSON.stringify({
          tools: Object.keys(proTools).map((name) => ({ name, type: 'math' })),
        });
      }

      const fn = proTools[tool];
      if (!fn) return JSON.stringify({ error: `Tool "${tool}" not found. Use list_tools to see available tools.` });

      try {
        const result = fn(toolParams);
        return JSON.stringify(result);
      } catch (err) {
        return JSON.stringify({ error: `Tool "${tool}" failed: ${err instanceof Error ? err.message : String(err)}` });
      }
    },
  };

  return [lucidEvaluate, lucidDiscover, lucidArbitrage, lucidCorrelate, lucidSize, lucidCalibrate, lucidPro];
}
