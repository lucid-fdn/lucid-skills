// ---------------------------------------------------------------------------
// domain.ts -- PredictDomainAdapter for brain SDK integration
// ---------------------------------------------------------------------------

import { PlatformRegistry } from './adapters/registry.js';
import { createBrainTools } from './brain/tools.js';
import { loadConfig } from './config.js';

const PREDICT_KEYWORDS = [
  'predict', 'forecast', 'probability', 'odds', 'bet', 'wager',
  'polymarket', 'manifold', 'kalshi', 'prediction.?market',
  'arbitrage', 'arb', 'kelly', 'bankroll', 'edge', 'expected.?value',
  'brier', 'calibration', 'overconfident', 'underconfident',
  'binary.?option', 'yes.?no', 'resolution', 'close.?date',
  'election', 'politics', 'will.+\\?',
];

const PREDICT_REGEX = new RegExp(
  PREDICT_KEYWORDS.map((k) => `\\b${k}\\b`).join('|'),
  'gi',
);

function getTool(tools: ReturnType<typeof createBrainTools>, name: string) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Brain tool "${name}" not found — this is a bug in lucid-predict`);
  return tool;
}

export const predictDomain = {
  id: 'predict' as const,
  name: 'Prediction Market Intelligence',
  version: '5.0.0',

  canHandle(intent: string): number {
    const matches = intent.match(PREDICT_REGEX);
    if (!matches) return 5;
    const score = Math.min(95, 50 + matches.length * 25);
    return score;
  },

  async evaluate(params: { query: string; probability?: number }, ctx?: any) {
    const config = ctx?.config ?? loadConfig();
    const registry = ctx?.registry ?? new PlatformRegistry();
    const tools = createBrainTools({ registry, config });
    return getTool(tools, 'lucid_evaluate').execute({ query: params.query, probability: params.probability });
  },

  async discover(params: { query: string }, ctx?: any) {
    const config = ctx?.config ?? loadConfig();
    const registry = ctx?.registry ?? new PlatformRegistry();
    const tools = createBrainTools({ registry, config });
    return getTool(tools, 'lucid_discover').execute({ query: params.query });
  },

  async arbitrage(params: { query?: string }, ctx?: any) {
    const config = ctx?.config ?? loadConfig();
    const registry = ctx?.registry ?? new PlatformRegistry();
    const tools = createBrainTools({ registry, config });
    return getTool(tools, 'lucid_arbitrage').execute({ query: params.query ?? '' });
  },

  async calibrate(params: { forecasts: any[] }, ctx?: any) {
    const config = ctx?.config ?? loadConfig();
    const registry = ctx?.registry ?? new PlatformRegistry();
    const tools = createBrainTools({ registry, config });
    return getTool(tools, 'lucid_calibrate').execute({ forecasts: params.forecasts });
  },
};
