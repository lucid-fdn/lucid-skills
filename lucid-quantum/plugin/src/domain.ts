// ---------------------------------------------------------------------------
// domain.ts -- QuantumDomainAdapter for brain SDK integration
// ---------------------------------------------------------------------------
import { AdapterRegistry } from './adapters/registry.js';
import { createBrainTools } from './brain/tools.js';
import { findTool } from './utils/find-tool.js';
import type { ToolDefinition } from './tools/index.js';

const QUANTUM_KEYWORDS = [
  'fleet', 'worker', 'gpu', 'cuda', 'metal', 'hip', 'rocm',
  'triage', 'classify', 'target', 'hash160', 'address',
  'fingerprint', 'wallet', 'nlocktime', 'transaction',
  'optimize', 'priority', 'weight', 'mode', 'keyspace',
  'narrow', 'temporal', 'timestamp', 'first.?seen',
  'brain.?wallet', 'passphrase', 'candidate', 'strategy',
  'cost', 'efficiency', 'gpu.?seconds', 'keys.?per.?second',
  'bitcoin', 'btc', 'private.?key', 'secp256k1', 'entropy',
  'bloom.?filter', 'hash160', 'ripemd160', 'sha256',
  'weak.?key', 'lcg', 'mersenne', 'openssl', 'randstorm',
  'canary', 'honeypot', 'checkpoint', 'verification',
  'quantum', 'search', 'exhausted', 'progress',
];

const QUANTUM_REGEX = new RegExp(
  QUANTUM_KEYWORDS.map((k) => `\\b${k}\\b`).join('|'),
  'gi',
);

function getTools(ctx?: any): ToolDefinition[] {
  const registry = ctx?.registry ?? new AdapterRegistry();
  return createBrainTools({ registry, agentPassportId: ctx?.agentPassportId });
}

export const quantumDomain = {
  id: 'quantum' as const,
  name: 'Bitcoin Quantum Key Search Intelligence',
  version: '1.0.0',

  canHandle(intent: string): number {
    const matches = intent.match(QUANTUM_REGEX);
    if (!matches) return 3; // low baseline
    const score = Math.min(95, 40 + matches.length * 20);
    return score;
  },

  async fleet(params: { query?: string }, ctx?: any) {
    return findTool(getTools(ctx), 'quantum_fleet').execute(params);
  },

  async triage(params: { limit?: number; offset?: number }, ctx?: any) {
    return findTool(getTools(ctx), 'quantum_triage').execute(params);
  },

  async fingerprint(params: { hash160_hex: string; [key: string]: unknown }, ctx?: any) {
    return findTool(getTools(ctx), 'quantum_fingerprint').execute(params);
  },

  async optimize(ctx?: any) {
    return findTool(getTools(ctx), 'quantum_optimize').execute({});
  },

  async narrow(params: { first_seen_timestamp: number }, ctx?: any) {
    return findTool(getTools(ctx), 'quantum_narrow').execute(params);
  },

  async brain(params: { strategy_tag?: string }, ctx?: any) {
    return findTool(getTools(ctx), 'quantum_brain').execute(params);
  },

  async cost(ctx?: any) {
    return findTool(getTools(ctx), 'quantum_cost').execute({});
  },

  async protect(ctx?: any) {
    return findTool(getTools(ctx), 'quantum_protect').execute({});
  },

  async review(ctx?: any) {
    return findTool(getTools(ctx), 'quantum_review').execute({});
  },
};
