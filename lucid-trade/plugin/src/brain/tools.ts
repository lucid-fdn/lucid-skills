// ---------------------------------------------------------------------------
// brain/tools.ts -- 7 brain MCP tools for Lucid Trade
// ---------------------------------------------------------------------------

import type { ToolDefinition } from '../tools/index.js';
import type { AdapterRegistry } from '../adapters/registry.js';
import type { ExchangeId, Timeframe } from '../types/index.js';
import type { ScanItem } from './types.js';
import { runAnalysis } from './analysis.js';
import {
  formatThinkResult,
  formatScanResult,
  formatReviewResult,
} from './formatter.js';
import { createTaTools } from '../tools/technical-analysis.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface BrainDeps {
  registry: AdapterRegistry;
  portfolioValue: number;
  riskPct: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse exchange and symbol from natural language query. */
function parseQuery(
  query: string,
  exchanges: string[],
): { exchange?: string; symbol?: string; timeframe: string } {
  const q = query.toLowerCase();

  // Find exchange
  let exchange: string | undefined;
  for (const ex of exchanges) {
    if (q.includes(ex.toLowerCase())) {
      exchange = ex;
      break;
    }
  }

  // Find symbol (common patterns: SOL, BTC/USDT, ETH, etc.)
  // Try uppercase first (most common in crypto), then fallback for known tickers
  const symbolMatch = query.match(/\b([A-Z]{2,10})(\/[A-Z]{2,6})?\b/);
  let symbol = symbolMatch ? symbolMatch[0]!.toUpperCase() : undefined;
  if (!symbol) {
    // Fallback: check for common tickers in any case
    const knownTickers = ['btc', 'eth', 'sol', 'avax', 'bnb', 'xrp', 'ada', 'dot', 'doge', 'link', 'matic', 'arb', 'op', 'apt', 'sui', 'near', 'atom', 'uni', 'aave', 'jup', 'wif', 'pepe', 'bonk'];
    for (const ticker of knownTickers) {
      if (q.includes(ticker)) { symbol = `${ticker.toUpperCase()}/USDT`; break; }
    }
  }
  if (symbol && !symbol.includes('/')) symbol = `${symbol}/USDT`;

  // Find timeframe
  const tfMatch = q.match(/\b(\d+[mhd]|1[wM])\b/);
  const timeframe = tfMatch?.[1] ?? '4h';

  return { exchange, symbol, timeframe };
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

/**
 * Create brain MCP tools (5 tools).
 *
 * 1. lucid_think  — Deep analysis on a single pair (structured verdict)
 * 2. lucid_scan   — Market scanning across instruments
 * 3. lucid_watch  — Smart alerts (RSI-based, not just price) — Phase 1: deferred
 * 4. lucid_review — AI performance review — Phase 1: placeholder
 * 5. lucid_pro    — Escape hatch to granular TA tools
 *
 * Removed (duplicates of web3-operator built-in tools):
 * - lucid_execute → use dex_swap / hl_place_order
 * - lucid_protect → use risk_check
 */
export function createBrainTools(deps: BrainDeps): ToolDefinition[] {
  const { registry, portfolioValue, riskPct } = deps;
  const proTools = createTaTools(registry);

  // ---- 1. lucid_think -------------------------------------------------------

  const think: ToolDefinition = {
    name: 'lucid_think',
    description:
      'Deep analysis on a single trading pair. Provide a natural language query ' +
      'like "analyze SOL on hyperliquid" or explicit exchange/symbol/timeframe params. ' +
      'Returns structured JSON by default, or prose text with format=text.',
    params: {
      query: {
        type: 'string',
        required: true,
        description:
          'Natural language query, e.g. "analyze SOL on hyperliquid 4h"',
      },
      format: {
        type: 'enum',
        values: ['json', 'text'],
        default: 'json',
        required: false,
        description: 'Output format: json (default) returns raw ThinkResult, text returns prose',
      },
      detail: {
        type: 'enum',
        values: ['compact', 'full'],
        default: 'full',
        required: false,
        description: 'Detail level: full (default) or compact',
      },
    },
    execute: async (params: Record<string, unknown>) => {
      const query = (params.query as string) || '';
      const format = (params.format as string) || 'json';
      const detail = (params.detail as string) || 'full';
      const exchangeIds = registry.list().map((a) => a.exchangeId);
      const parsed = parseQuery(query, exchangeIds);

      // Resolve exchange
      const exchangeId = parsed.exchange ?? exchangeIds[0];
      if (!exchangeId) {
        return 'No exchanges configured. Register at least one adapter.';
      }

      const adapter = registry.get(exchangeId as ExchangeId);
      if (!adapter) {
        return `Exchange "${exchangeId}" not configured.`;
      }

      // Resolve symbol
      const symbol = parsed.symbol ?? 'BTC/USDT';

      // Fetch candles
      const candles = await adapter.getCandles({
        exchange: exchangeId as ExchangeId,
        symbol,
        timeframe: parsed.timeframe as Timeframe,
        limit: 60,
      });

      // Run analysis
      const result = runAnalysis({
        symbol,
        candles,
        portfolioValue,
        riskPct,
        venue: exchangeId,
        exchange: exchangeId,
        timeframe: parsed.timeframe,
      });

      if (format === 'text') {
        return formatThinkResult(result);
      }

      // Compact mode: strip evidence details and reduce rulesTriggered
      if (detail === 'compact') {
        const { evidence: _ev, ...rest } = result;
        return JSON.stringify({
          ...rest,
          rulesTriggered: result.rulesTriggered.map((r) => ({
            id: r.id,
            contribution: r.contribution,
          })),
        });
      }

      return JSON.stringify(result);
    },
  };

  // ---- 2. lucid_scan --------------------------------------------------------

  const scan: ToolDefinition = {
    name: 'lucid_scan',
    description:
      'Scan multiple instruments across connected exchanges for trading opportunities. ' +
      'Filters by confidence >= 60 and returns up to 10 results.',
    params: {
      criteria: {
        type: 'string',
        required: true,
        description:
          'Scan criteria, e.g. "oversold altcoins", "high volume breakouts"',
      },
    },
    execute: async (params: Record<string, unknown>) => {
      const criteria = (params.criteria as string) || 'all';
      const adapters = registry.list();
      const scannedExchanges: string[] = [];
      let scannedPairs = 0;
      const matches: ScanItem[] = [];

      for (const adapter of adapters) {
        scannedExchanges.push(adapter.exchangeId);
        let instruments: Awaited<ReturnType<typeof adapter.getInstruments>>;
        try {
          instruments = await adapter.getInstruments();
        } catch {
          continue;
        }

        // Limit to 10 instruments per exchange to keep response times reasonable
        const toScan = instruments.slice(0, 10);
        scannedPairs += toScan.length;

        for (const inst of toScan) {
          try {
            const candles = await adapter.getCandles({
              exchange: adapter.exchangeId,
              symbol: inst.symbol,
              timeframe: '4h' as Timeframe,
              limit: 60,
            });

            const analysis = runAnalysis({
              symbol: inst.symbol,
              candles,
              portfolioValue,
              riskPct,
            });

            if (analysis.score >= 60) {
              const signalDesc = analysis.rulesTriggered[0]?.description ?? 'technical signal';
              matches.push({
                symbol: inst.symbol,
                exchange: adapter.exchangeId,
                signal: `${analysis.verdict} (${signalDesc})`,
                confidence: analysis.score,
              });
            }
          } catch {
            // Skip instruments that fail to fetch
            continue;
          }
        }
      }

      // Sort by confidence descending
      matches.sort((a, b) => b.confidence - a.confidence);

      return formatScanResult({
        criteria,
        matches: matches.slice(0, 10),
        scannedExchanges,
        scannedPairs,
      });
    },
  };

  // ---- 3. lucid_watch -------------------------------------------------------

  const watch: ToolDefinition = {
    name: 'lucid_watch',
    description:
      'Set up a smart alert for a trading pair. Analyzes the condition using ' +
      'technical indicators (RSI, MACD, price levels) and returns a cron_schedule ' +
      'instruction for the agent to execute. The scheduled task will run lucid_think ' +
      'periodically and notify the user when the condition is met.',
    params: {
      condition: {
        type: 'string',
        required: true,
        description:
          'Alert condition, e.g. "SOL drops below $120", "BTC RSI < 30", "ETH breaks above $4000"',
      },
      interval: {
        type: 'string',
        required: false,
        description: 'Check interval: "5m", "15m", "1h", "4h". Default: "15m"',
        default: '15m',
      },
    },
    execute: async (params: Record<string, unknown>) => {
      const condition = (params.condition as string) || '';
      const interval = (params.interval as string) || '15m';

      // Parse the condition to extract symbol and thresholds
      const exchangeIds = registry.list().map((a) => a.exchangeId);
      const parsed = parseQuery(condition, exchangeIds);
      const symbol = parsed.symbol ?? 'BTC/USDT';

      // Run current analysis to establish baseline
      const exchangeId = parsed.exchange ?? exchangeIds[0];
      let currentAnalysis = 'Unable to fetch current state';
      if (exchangeId) {
        const adapter = registry.get(exchangeId as ExchangeId);
        if (adapter) {
          try {
            const candles = await adapter.getCandles({
              exchange: exchangeId as ExchangeId,
              symbol,
              timeframe: '4h' as Timeframe,
              limit: 60,
            });
            const result = runAnalysis({
              symbol,
              candles,
              portfolioValue,
              riskPct,
            });
            currentAnalysis = `Current: ${symbol} score=${result.score}, verdict=${result.verdict}, RSI=${result.evidence?.rsi ?? 'N/A'}`;
          } catch {
            currentAnalysis = `Could not fetch ${symbol} data`;
          }
        }
      }

      // Map interval to cron expression
      const cronMap: Record<string, string> = {
        '5m': '*/5 * * * *',
        '15m': '*/15 * * * *',
        '30m': '*/30 * * * *',
        '1h': '0 * * * *',
        '4h': '0 */4 * * *',
      };
      const cronExpr = cronMap[interval] || '*/15 * * * *';

      return JSON.stringify({
        status: 'ready',
        watch: {
          symbol,
          condition,
          interval,
          baseline: currentAnalysis,
        },
        action: {
          tool: 'cron_schedule',
          params: {
            cron_expression: cronExpr,
            task_prompt: `Run lucid_think on ${symbol}. Check if this condition is met: "${condition}". If met, send a clear alert message to the user with the current analysis. If not met, reply NO_REPLY.`,
          },
          instruction: 'Call cron_schedule with these params to activate the watch. Tell the user the alert is set.',
        },
      });
    },
  };

  // ---- 4. lucid_review ------------------------------------------------------

  const review: ToolDefinition = {
    name: 'lucid_review',
    description:
      'AI-powered trading performance review. Analyzes all connected exchanges, ' +
      'scores each position with lucid_think, and returns a structured report ' +
      'with best/worst performers, overall risk, and actionable suggestions.',
    params: {
      detail: {
        type: 'enum',
        values: ['summary', 'full'],
        default: 'summary',
        required: false,
        description: 'Detail level: summary (quick overview) or full (per-position analysis)',
      },
    },
    execute: async (params: Record<string, unknown>) => {
      const detail = (params.detail as string) || 'summary';
      const adapters = registry.list();

      if (adapters.length === 0) {
        return formatReviewResult({
          period: 'current',
          totalPnl: 'N/A',
          winRate: 'N/A',
          sharpe: 0,
          bestSetup: 'N/A',
          worstSetup: 'N/A',
          suggestion: 'No exchanges connected. Connect an exchange adapter to enable performance review.',
        });
      }

      // Gather positions from all exchanges
      const positions: Array<{
        exchange: string;
        symbol: string;
        side: string;
        pnlPct: number;
        score: number;
        verdict: string;
      }> = [];

      for (const adapter of adapters) {
        if (!adapter.getPositions) continue;
        try {
          const adapterPositions = await adapter.getPositions();
          for (const pos of adapterPositions) {
            const pnlPct = pos.entryPrice > 0
              ? ((pos.markPrice - pos.entryPrice) / pos.entryPrice) * 100
              : 0;

            let score = 50;
            let verdict = 'HOLD';

            // Run lucid_think on each position for AI analysis (full mode only)
            if (detail === 'full') {
              try {
                const candles = await adapter.getCandles({
                  exchange: adapter.exchangeId,
                  symbol: pos.symbol,
                  timeframe: '4h' as Timeframe,
                  limit: 60,
                });
                const analysis = runAnalysis({
                  symbol: pos.symbol,
                  candles,
                  portfolioValue,
                  riskPct,
                });
                score = analysis.score;
                verdict = analysis.verdict;
              } catch {
                // Skip analysis if candles unavailable
              }
            }

            positions.push({
              exchange: adapter.exchangeId,
              symbol: pos.symbol,
              side: pos.side,
              pnlPct,
              score,
              verdict,
            });
          }
        } catch {
          // Skip exchanges that fail
        }
      }

      if (positions.length === 0) {
        return formatReviewResult({
          period: 'current',
          totalPnl: 'No open positions',
          winRate: 'N/A',
          sharpe: 0,
          bestSetup: 'N/A',
          worstSetup: 'N/A',
          suggestion: 'No open positions found. Use lucid_scan to find opportunities.',
        });
      }

      // Calculate stats
      const winners = positions.filter(p => p.pnlPct > 0);
      const losers = positions.filter(p => p.pnlPct <= 0);
      const avgPnl = positions.reduce((sum, p) => sum + p.pnlPct, 0) / positions.length;
      const best = positions.reduce((a, b) => a.pnlPct > b.pnlPct ? a : b);
      const worst = positions.reduce((a, b) => a.pnlPct < b.pnlPct ? a : b);
      const winRate = positions.length > 0
        ? `${((winners.length / positions.length) * 100).toFixed(0)}%`
        : 'N/A';

      // Simple Sharpe approximation
      const mean = avgPnl;
      const variance = positions.reduce((sum, p) => sum + Math.pow(p.pnlPct - mean, 2), 0) / positions.length;
      const stdDev = Math.sqrt(variance);
      const sharpe = stdDev > 0 ? mean / stdDev : 0;

      // Suggestion based on analysis
      let suggestion = '';
      if (avgPnl < -5) {
        suggestion = 'Portfolio is underwater. Consider tightening stop losses and reducing position sizes.';
      } else if (losers.length > winners.length) {
        suggestion = 'More losing positions than winning. Review entry criteria and consider closing weakest positions.';
      } else if (worst.pnlPct < -10) {
        suggestion = `${worst.symbol} is down ${worst.pnlPct.toFixed(1)}%. Consider cutting losses or adding a stop loss.`;
      } else {
        suggestion = 'Portfolio is performing well. Consider taking partial profits on top performers.';
      }

      return formatReviewResult({
        period: 'current',
        totalPnl: `Avg: ${avgPnl.toFixed(2)}% across ${positions.length} positions (${winners.length}W/${losers.length}L)`,
        winRate,
        sharpe: Number(sharpe.toFixed(2)),
        bestSetup: `${best.symbol} on ${best.exchange}: +${best.pnlPct.toFixed(1)}%${detail === 'full' ? ` (score=${best.score}, ${best.verdict})` : ''}`,
        worstSetup: `${worst.symbol} on ${worst.exchange}: ${worst.pnlPct.toFixed(1)}%${detail === 'full' ? ` (score=${worst.score}, ${worst.verdict})` : ''}`,
        suggestion,
      });
    },
  };

  // ---- 7. lucid_pro ---------------------------------------------------------

  const pro: ToolDefinition = {
    name: 'lucid_pro',
    description:
      'Escape hatch to granular TA tools. Use tool="list_tools" to see available ' +
      'tools, or specify a tool name and params to execute directly.',
    params: {
      tool: {
        type: 'string',
        required: true,
        description:
          'Tool name to execute, or "list_tools" to list available tools',
      },
      params: {
        type: 'object',
        required: false,
        description: 'Parameters to pass to the selected tool',
      },
    },
    execute: async (params: Record<string, unknown>) => {
      const toolName = params.tool as string;

      if (toolName === 'list_tools') {
        const lines = proTools.map(
          (t) => `  ${t.name} — ${t.description.slice(0, 80)}`,
        );
        return `Available pro tools (${proTools.length}):\n${lines.join('\n')}`;
      }

      const target = proTools.find((t) => t.name === toolName);
      if (!target) {
        const names = proTools.map((t) => t.name).join(', ');
        return `Tool "${toolName}" not found. Available: ${names}`;
      }

      const toolParams = (params.params as Record<string, unknown>) ?? {};
      return target.execute(toolParams);
    },
  };

  return [think, scan, watch, review, pro];
}
