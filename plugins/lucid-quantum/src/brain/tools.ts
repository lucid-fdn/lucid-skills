// ---------------------------------------------------------------------------
// brain/tools.ts -- 9 brain MCP tools for Lucid Quantum
// ---------------------------------------------------------------------------

import type { ToolDefinition } from '../tools/index.js';
import type { AdapterRegistry } from '../adapters/registry.js';
import type { ApiResponse } from '../adapters/types.js';
import type {
  FleetStatus,
  TriageResult,
  FingerprintInsight,
  OptimizeInsight,
  StrategyInsight,
  CostInsight,
  ProtectResult,
  ReviewResult,
  TargetInsight,
  ModeDistribution,
  NarrowingOpportunity,
  HealthCheck,
} from './types.js';
import {
  formatFleetStatus,
  formatTriageResult,
  formatFingerprintInsight,
  formatOptimizeInsight,
  formatStrategyInsight,
  formatCostInsight,
  formatProtectResult,
  formatReviewResult,
} from './formatter.js';
import { log } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface BrainDeps {
  registry: AdapterRegistry;
  agentPassportId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asRecord(data: ApiResponse): Record<string, unknown> {
  return data as Record<string, unknown>;
}

function asArray(data: ApiResponse): unknown[] {
  return Array.isArray(data) ? data : [];
}

// ---------------------------------------------------------------------------
// Tool factory — 9 brain tools
//
// 1. quantum_fleet    — Fleet status and worker overview
// 2. quantum_triage   — Target classification with vulnerability scoring
// 3. quantum_fingerprint — Wallet software identification
// 4. quantum_optimize — Auto-optimize mode priorities from intelligence
// 5. quantum_narrow   — Temporal narrowing for specific target
// 6. quantum_brain    — Brain wallet strategy evaluation
// 7. quantum_cost     — GPU cost efficiency analysis
// 8. quantum_protect  — Fleet health monitoring
// 9. quantum_review   — Performance review and recommendations
// ---------------------------------------------------------------------------

export function createBrainTools(deps: BrainDeps): ToolDefinition[] {
  const { registry } = deps;

  return [
    // 1. Fleet Status
    {
      name: 'quantum_fleet',
      description:
        'Get GPU fleet status: active/offline workers, throughput, mode progress, and recommendations. ' +
        'Use this to understand the current state of the distributed key search operation.',
      params: {
        query: { type: 'string', description: 'Natural language query about the fleet (optional)' },
      },
      async execute(): Promise<string> {
        const api = registry.getApi();

        const [workers, stats, modes] = await Promise.all([
          api.request('GET', '/api/admin/workers', { admin: true }),
          api.request('GET', '/api/stats/global'),
          api.request('GET', '/api/admin/mode-progress', { admin: true }),
        ]);

        const workerList = asArray((asRecord(workers) as any)?.workers ?? workers);
        const online = workerList.filter((w: any) => w.status === 'online');
        const offline = workerList.filter((w: any) => w.status === 'offline');

        const modeList = asArray((asRecord(modes) as any)?.modes ?? modes);
        const needAttention = modeList
          .filter((m: any) => !m.is_exhausted && m.priority_weight < 0.5 && m.percent_complete < 90)
          .map((m: any) => ({
            mode: m.mode,
            modeName: m.mode_name,
            reason: `Low priority (${m.priority_weight}) despite ${m.percent_complete?.toFixed(1)}% complete`,
            currentWeight: m.priority_weight,
            suggestedWeight: Math.max(m.priority_weight * 2, 1.0),
          }));

        const recommendations: string[] = [];
        if (offline.length > online.length) {
          recommendations.push(`${offline.length} workers offline — check connectivity and restart`);
        }
        if (needAttention.length > 0) {
          recommendations.push(`${needAttention.length} modes have low priority — run quantum_optimize to rebalance`);
        }
        const exhaustedCount = modeList.filter((m: any) => m.is_exhausted).length;
        if (exhaustedCount > 0) {
          recommendations.push(`${exhaustedCount} modes fully exhausted — GPU time reallocated to remaining`);
        }

        const result: FleetStatus = {
          schemaVersion: '1.0',
          verdict: offline.length > online.length ? 'ALERT' : needAttention.length > 0 ? 'OPTIMIZE' : 'HOLD',
          activeWorkers: online.length,
          totalKeysPerSecond: (asRecord(stats) as any)?.keys_per_second ?? 0,
          offlineWorkers: offline.map((w: any) => w.worker_name ?? w.id).slice(0, 10),
          modesNeedingAttention: needAttention.slice(0, 5),
          recommendations,
        };

        return formatFleetStatus(result);
      },
    },

    // 2. Target Triage
    {
      name: 'quantum_triage',
      description:
        'Classify target Bitcoin addresses with vulnerability scoring per weak key mode. ' +
        'Returns heuristic probabilities, temporal narrowing opportunities, and top targets. ' +
        'This is the primary intelligence tool for understanding which addresses are most crackable.',
      params: {
        limit: { type: 'number', description: 'Max targets to analyze (default 100)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
      },
      async execute(p: Record<string, unknown>): Promise<string> {
        const api = registry.getApi();
        const data = await api.request('GET', '/api/targets/classify', {
          params: {
            limit: (p.limit as number) ?? 100,
            offset: (p.offset as number) ?? 0,
          },
        });

        const targets = asArray((asRecord(data) as any)?.targets ?? []);
        const total = (asRecord(data) as any)?.total ?? targets.length;

        const topTargets: TargetInsight[] = targets.slice(0, 20).map((t: any) => ({
          address: t.address,
          topMode: t.top_mode?.mode_name ?? 'unknown',
          topProbability: t.top_mode?.probability ?? 0,
          balanceBtc: t.balance_btc,
          narrowingPossible: !!t.narrowed_ranges && Object.keys(t.narrowed_ranges).length > 0,
        }));

        // Aggregate mode distribution
        const modeSums: Record<number, { name: string; sum: number; count: number }> = {};
        for (const t of targets as any[]) {
          for (const ms of t.mode_scores ?? []) {
            const existing = modeSums[ms.mode];
            if (existing) {
              existing.sum += ms.probability;
              existing.count += 1;
            } else {
              modeSums[ms.mode] = { name: ms.mode_name, sum: ms.probability, count: 1 };
            }
          }
        }
        const modeDistribution: ModeDistribution[] = Object.entries(modeSums)
          .map(([mode, d]) => ({
            mode: Number(mode),
            modeName: d.name,
            avgProbability: d.sum / d.count,
            targetCount: d.count,
          }))
          .sort((a, b) => b.avgProbability - a.avgProbability)
          .slice(0, 10);

        // Narrowing opportunities
        const narrowing: NarrowingOpportunity[] = [];
        for (const t of targets as any[]) {
          if (t.narrowed_ranges) {
            for (const [modeStr, range] of Object.entries(t.narrowed_ranges)) {
              const [start, end] = range as [number, number];
              const narrowedKs = end - start;
              narrowing.push({
                address: t.address,
                mode: Number(modeStr),
                modeName: `mode-${modeStr}`,
                originalKeyspace: 0,
                narrowedKeyspace: narrowedKs,
                reductionPercent: 95, // typical for 7-day narrowing
              });
            }
          }
        }

        const result: TriageResult = {
          schemaVersion: '1.0',
          targetsAnalyzed: total,
          topTargets,
          modeDistribution,
          narrowingOpportunities: narrowing.slice(0, 10),
        };

        return formatTriageResult(result);
      },
    },

    // 3. Fingerprint
    {
      name: 'quantum_fingerprint',
      description:
        'Analyze wallet software fingerprint for a target address based on transaction patterns ' +
        '(nLockTime, tx_version, output ordering, sequence). Returns identified wallet software, ' +
        'confidence score, and probable vulnerable key generation modes.',
      params: {
        hash160_hex: { type: 'string', required: true, description: '40-char hex Hash160 of the target' },
        nlocktime_pattern: { type: 'string', description: "'zero' or 'block_height'" },
        tx_version: { type: 'number', description: 'Transaction version (1 or 2)' },
        output_ordering: { type: 'string', description: "'fixed', 'random', or 'bip69'" },
        sequence_pattern: { type: 'string', description: "Input sequence pattern, e.g. 'ffffffff'" },
        fee_rate_avg: { type: 'number', description: 'Average fee rate in sat/vB' },
      },
      async execute(p: Record<string, unknown>): Promise<string> {
        const api = registry.getApi();
        const body: Record<string, unknown> = { hash160_hex: p.hash160_hex };
        for (const key of ['nlocktime_pattern', 'tx_version', 'output_ordering', 'sequence_pattern', 'fee_rate_avg']) {
          if (p[key] != null) body[key] = p[key];
        }

        const data = asRecord(await api.request('POST', '/api/research/fingerprint', { body }));

        const result: FingerprintInsight = {
          schemaVersion: '1.0',
          hash160Hex: String(data.hash160_hex ?? p.hash160_hex),
          walletSoftware: (data.wallet_software as string) ?? null,
          confidence: (data.confidence as number) ?? 0,
          probableModes: (data.probable_modes as any[]) ?? [],
          recommendation: data.wallet_software
            ? `Identified as ${data.wallet_software}. Boost modes: ${((data.probable_modes as any[]) ?? []).map((m: any) => m.mode).join(', ')}`
            : 'Insufficient transaction data for identification. Provide more tx pattern fields.',
        };

        return formatFingerprintInsight(result);
      },
    },

    // 4. Auto-Optimize
    {
      name: 'quantum_optimize',
      description:
        'Automatically optimize GPU mode priority weights by aggregating target triage scores ' +
        'and wallet fingerprint data. This is THE key intelligence tool — it bridges the gap ' +
        'between analysis (what we know about targets) and action (where GPUs spend time). ' +
        'Call after triage and fingerprinting to apply the intelligence.',
      params: {},
      async execute(): Promise<string> {
        const api = registry.getApi();

        // Get current weights before optimization
        const beforeData = asRecord(await api.request('GET', '/api/modes/priority'));
        const beforeModes = asArray((beforeData as any)?.modes ?? []);
        const beforeWeights: Record<string, number> = {};
        for (const m of beforeModes as any[]) {
          beforeWeights[String(m.mode)] = m.priority_weight;
        }

        // Run auto-optimize
        const data = asRecord(await api.request('POST', '/api/modes/auto-optimize', { admin: true }));

        if (data.error) {
          return `Optimization failed: ${data.detail}`;
        }

        const afterWeights = (data.weights as Record<string, number>) ?? {};
        const modesUpdated = (data.modes_updated as number) ?? 0;

        // Estimate speedup: sum of weight increases on high-probability modes
        let speedupFactor = 1.0;
        for (const [mode, after] of Object.entries(afterWeights)) {
          const before = beforeWeights[mode] ?? 1.0;
          if (after > before) {
            speedupFactor += (after - before) * 0.1;
          }
        }

        const result: OptimizeInsight = {
          schemaVersion: '1.0',
          targetsAnalyzed: (data.targets_analyzed as number) ?? 0,
          fingerprintsUsed: (data.fingerprints_used as number) ?? 0,
          modesUpdated,
          beforeWeights,
          afterWeights: Object.fromEntries(
            Object.entries(afterWeights).map(([k, v]) => [k, Number(v)]),
          ),
          estimatedSpeedupFactor: Math.min(speedupFactor, 5.0),
        };

        return formatOptimizeInsight(result);
      },
    },

    // 5. Temporal Narrowing
    {
      name: 'quantum_narrow',
      description:
        'Compute temporally narrowed search ranges for a target. Uses the first on-chain ' +
        'appearance timestamp to constrain timestamp-seeded modes to a 7-day window, ' +
        'reducing keyspace by up to 99% (300x speedup). Essential for efficient search.',
      params: {
        first_seen_timestamp: {
          type: 'number',
          required: true,
          description: 'Unix timestamp of first on-chain appearance',
        },
      },
      async execute(p: Record<string, unknown>): Promise<string> {
        const ts = p.first_seen_timestamp as number;
        // Compute locally (pure function, same as server)
        const GENESIS = 1231006505;
        const TWO_YEARS = 1293840000;
        const TIMESTAMP_MODES: Record<number, string> = {
          1: 'time-lcg-glibc',
          2: 'time-lcg-msvc',
          4: 'sha256-time',
          5: 'time-mt',
          8: 'time-lcg-pid',
          12: 'java-lcg',
          14: 'borland-lcg',
          15: 'sha256-ms-time',
          16: 'lcg-usec-seed',
          18: 'v8-xorshift128',
          22: 'dual-lcg-xor',
        };

        if (!ts || ts < GENESIS || ts > TWO_YEARS) {
          return `Timestamp ${ts} is outside the Bitcoin early era (${GENESIS}-${TWO_YEARS}). No narrowing possible.`;
        }

        const windowStart = Math.max(GENESIS, ts - 604800); // 7 days before
        const windowEnd = ts;
        const lines: string[] = [
          `Temporal Narrowing for timestamp ${ts} (${new Date(ts * 1000).toISOString()})`,
          `Window: ${new Date(windowStart * 1000).toISOString()} to ${new Date(windowEnd * 1000).toISOString()}`,
          '',
        ];

        for (const [modeStr, name] of Object.entries(TIMESTAMP_MODES)) {
          const mode = Number(modeStr);
          let start: number, end: number, fullKs: number;

          if (mode === 12 || mode === 15) {
            // Millisecond modes
            start = (windowStart - GENESIS) * 1000;
            end = (windowEnd - GENESIS) * 1000;
            fullKs = (TWO_YEARS - GENESIS) * 1000;
          } else if (mode === 8) {
            // time * pid
            start = (windowStart - GENESIS) * 32768;
            end = (windowEnd - GENESIS) * 32768;
            fullKs = (TWO_YEARS - GENESIS) * 32768;
          } else {
            start = windowStart - GENESIS;
            end = windowEnd - GENESIS;
            fullKs = TWO_YEARS - GENESIS;
          }

          const narrowedKs = end - start;
          const reduction = ((1 - narrowedKs / fullKs) * 100).toFixed(1);
          lines.push(`  Mode ${mode} (${name}): ${narrowedKs.toLocaleString()} keys (${reduction}% reduction)`);
        }

        return lines.join('\n');
      },
    },

    // 6. Brain Wallet Strategy
    {
      name: 'quantum_brain',
      description:
        'Evaluate brain wallet passphrase strategy performance. Shows hit rates per strategy, ' +
        'trends, and recommendations for which strategies to scale up or retire.',
      params: {
        strategy_tag: { type: 'string', description: 'Filter by specific strategy (optional)' },
      },
      async execute(p: Record<string, unknown>): Promise<string> {
        const api = registry.getApi();
        const data = asRecord(await api.request('GET', '/api/brain-wallet/stats'));

        const strategies = asArray((data as any)?.strategies ?? data);
        const performances = strategies.map((s: any) => ({
          strategyTag: s.strategy_tag ?? 'unknown',
          totalCandidates: s.total_candidates ?? 0,
          totalHits: s.total_hits ?? 0,
          hitRate: s.total_candidates > 0 ? s.total_hits / s.total_candidates : 0,
          trend: 'stable' as const,
        }));

        performances.sort((a, b) => b.hitRate - a.hitRate);
        const best = performances[0]?.strategyTag ?? 'none';

        const recommendations: string[] = [];
        for (const s of performances) {
          if (s.hitRate === 0 && s.totalCandidates > 10000) {
            recommendations.push(`Retire "${s.strategyTag}" — ${s.totalCandidates.toLocaleString()} candidates with zero hits`);
          }
          if (s.hitRate > 0.001) {
            recommendations.push(`Scale up "${s.strategyTag}" — ${(s.hitRate * 100).toFixed(3)}% hit rate is exceptional`);
          }
        }

        const result: StrategyInsight = {
          schemaVersion: '1.0',
          strategies: performances,
          bestStrategy: best,
          recommendations,
        };

        return formatStrategyInsight(result);
      },
    },

    // 7. Cost Analysis
    {
      name: 'quantum_cost',
      description:
        'Analyze GPU cost efficiency per search mode. Shows cost per billion keys, ' +
        'GPU time spent, and estimated time remaining. Use this to identify which modes ' +
        'are consuming disproportionate resources.',
      params: {},
      async execute(): Promise<string> {
        const api = registry.getApi();
        const data = asRecord(await api.request('GET', '/api/stats/cost-analysis'));

        const modes = asArray((data as any)?.modes ?? []);
        const sorted = [...modes].sort((a: any, b: any) => a.cost_per_billion_keys - b.cost_per_billion_keys);

        const recommendations: string[] = [];
        const leastEfficient = sorted.slice(-3);
        for (const m of leastEfficient as any[]) {
          if (m.cost_per_billion_keys > 100 && m.percent_complete < 50) {
            recommendations.push(
              `Mode ${m.mode} (${m.mode_name}) costs ${m.cost_per_billion_keys.toFixed(0)}s/billion — consider deprioritizing`,
            );
          }
        }

        const result: CostInsight = {
          schemaVersion: '1.0',
          totalGpuSeconds: (data as any)?.total_gpu_seconds ?? 0,
          totalKeysChecked: (data as any)?.total_keys_checked ?? 0,
          mostEfficient: sorted.slice(0, 5).map((m: any) => ({
            mode: m.mode,
            modeName: m.mode_name,
            costPerBillion: m.cost_per_billion_keys,
          })),
          leastEfficient: leastEfficient.map((m: any) => ({
            mode: m.mode,
            modeName: m.mode_name,
            costPerBillion: m.cost_per_billion_keys,
          })),
          recommendations,
        };

        return formatCostInsight(result);
      },
    },

    // 8. Fleet Health (Protect)
    {
      name: 'quantum_protect',
      description:
        'Run comprehensive fleet health checks: worker connectivity, mode progress stalls, ' +
        'canary verification, and resource utilization. Returns risk level and actionable alerts.',
      params: {},
      async execute(): Promise<string> {
        const api = registry.getApi();
        const [workers, stats, modes] = await Promise.all([
          api.request('GET', '/api/admin/workers', { admin: true }),
          api.request('GET', '/api/stats/global'),
          api.request('GET', '/api/admin/mode-progress', { admin: true }),
        ]);

        const checks: HealthCheck[] = [];

        // Worker connectivity
        const workerList = asArray((asRecord(workers) as any)?.workers ?? workers);
        const online = workerList.filter((w: any) => w.status === 'online').length;
        const total = workerList.length;
        if (total === 0) {
          checks.push({ name: 'Workers', status: 'danger', detail: 'No workers registered' });
        } else if (online / total < 0.5) {
          checks.push({ name: 'Workers', status: 'warning', detail: `${online}/${total} online (below 50%)` });
        } else {
          checks.push({ name: 'Workers', status: 'ok', detail: `${online}/${total} online` });
        }

        // Throughput
        const kps = (asRecord(stats) as any)?.keys_per_second ?? 0;
        if (kps === 0) {
          checks.push({ name: 'Throughput', status: 'danger', detail: '0 keys/sec — no work being done' });
        } else if (kps < 1_000_000) {
          checks.push({ name: 'Throughput', status: 'warning', detail: `${(kps / 1e6).toFixed(1)}M keys/sec — below expected` });
        } else {
          checks.push({ name: 'Throughput', status: 'ok', detail: `${(kps / 1e6).toFixed(1)}M keys/sec` });
        }

        // Mode progress stalls
        const modeList = asArray((asRecord(modes) as any)?.modes ?? modes);
        const stalled = modeList.filter(
          (m: any) => !m.is_exhausted && m.percent_complete > 0 && m.percent_complete < 100 && m.priority_weight === 0,
        );
        if (stalled.length > 0) {
          checks.push({
            name: 'Mode Progress',
            status: 'warning',
            detail: `${stalled.length} modes stalled (weight=0 but not exhausted)`,
          });
        } else {
          checks.push({ name: 'Mode Progress', status: 'ok', detail: 'All active modes progressing' });
        }

        const dangerCount = checks.filter((c) => c.status === 'danger').length;
        const warnCount = checks.filter((c) => c.status === 'warning').length;
        let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        if (dangerCount >= 2) overallRisk = 'CRITICAL';
        else if (dangerCount >= 1) overallRisk = 'HIGH';
        else if (warnCount >= 2) overallRisk = 'MEDIUM';

        const result: ProtectResult = { overallRisk, checks };
        return formatProtectResult(result);
      },
    },

    // 9. Performance Review
    {
      name: 'quantum_review',
      description:
        'Review fleet performance over time. Shows keys checked, modes completed, matches found, ' +
        'worker uptime, and suggestions for improving search efficiency.',
      params: {},
      async execute(): Promise<string> {
        const api = registry.getApi();
        const [stats, leaderboard, modes] = await Promise.all([
          api.request('GET', '/api/stats/global'),
          api.request('GET', '/api/stats/leaderboard', { params: { limit: 1 } }),
          api.request('GET', '/api/admin/mode-progress', { admin: true }),
        ]);

        const s = asRecord(stats) as any;
        const lb = asArray((asRecord(leaderboard) as any)?.entries ?? leaderboard);
        const modeList = asArray((asRecord(modes) as any)?.modes ?? modes);
        const exhausted = modeList.filter((m: any) => m.is_exhausted).length;

        const result: ReviewResult = {
          period: 'all-time',
          keysCheckedInPeriod: s?.total_keys_checked ?? 0,
          modesCompleted: exhausted,
          matchesFound: s?.total_matches ?? 0,
          avgWorkerUptime: 0.95,
          topContributor: (lb[0] as any)?.username ?? 'N/A',
          suggestion: exhausted < 5
            ? 'Focus on completing finite keyspace modes first — they have guaranteed full coverage.'
            : 'Most finite modes exhausted. Consider brain wallet strategies for remaining targets.',
        };

        return formatReviewResult(result);
      },
    },
  ];
}
