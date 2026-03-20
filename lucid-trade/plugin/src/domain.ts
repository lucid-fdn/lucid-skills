// ---------------------------------------------------------------------------
// domain.ts -- TradeDomainAdapter for brain SDK integration
// ---------------------------------------------------------------------------
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

const TRADE_REGEX = new RegExp(
  TRADE_KEYWORDS.map((k) => `\\b${k}\\b`).join('|'),
  'gi',
);

export const tradeDomain = {
  id: 'trade' as const,
  name: 'Crypto Trading Intelligence',
  version: '5.0.0',

  canHandle(intent: string): number {
    const matches = intent.match(TRADE_REGEX);
    if (!matches) return 5; // baseline for unknown
    const score = Math.min(95, 50 + matches.length * 25);
    return score;
  },

  // Brain methods delegate to brain tools (stateless for now)
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
