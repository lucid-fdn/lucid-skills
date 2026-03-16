// ---------------------------------------------------------------------------
// memory/index.ts -- OpenClaw memory integration for persistent agent learning
// ---------------------------------------------------------------------------
//
// Provides structured memory schemas for agents to persist and retrieve:
// - Fleet state snapshots (worker counts, throughput trends)
// - Strategy results (brain wallet hit rates over time)
// - Optimization history (priority weight changes, speedup measurements)
// - Fingerprint knowledge (accumulated wallet identifications)
//
// Memory is stored as JSON files in the QUANTUM_MEMORY_DIR directory,
// or via the OpenClaw memory API when running in SaaS mode.
// ---------------------------------------------------------------------------

import { log } from '../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Memory schemas
// ---------------------------------------------------------------------------

export interface FleetSnapshot {
  timestamp: string;
  activeWorkers: number;
  totalKeysPerSecond: number;
  modesExhausted: number;
  modesActive: number;
  offlineWorkerNames: string[];
}

export interface StrategyRecord {
  timestamp: string;
  strategyTag: string;
  candidatesSubmitted: number;
  hits: number;
  hitRate: number;
  verdict: 'scale_up' | 'stable' | 'retire';
}

export interface OptimizationRecord {
  timestamp: string;
  modesUpdated: number;
  targetsAnalyzed: number;
  fingerprintsUsed: number;
  weightChanges: Record<string, { before: number; after: number }>;
  estimatedSpeedup: number;
}

export interface FingerprintRecord {
  hash160Hex: string;
  walletSoftware: string;
  confidence: number;
  probableModes: number[];
  identifiedAt: string;
}

// ---------------------------------------------------------------------------
// Memory store
// ---------------------------------------------------------------------------

export class QuantumMemory {
  private readonly dir: string | null;
  private fleetHistory: FleetSnapshot[] = [];
  private strategyHistory: StrategyRecord[] = [];
  private optimizationHistory: OptimizationRecord[] = [];
  private fingerprintKnowledge: Map<string, FingerprintRecord> = new Map();

  constructor(memoryDir?: string) {
    this.dir = memoryDir ?? null;
    if (this.dir) {
      this.loadFromDisk();
    }
  }

  // -- Fleet snapshots --

  recordFleetSnapshot(snapshot: FleetSnapshot): void {
    this.fleetHistory.push(snapshot);
    // Keep last 1000 snapshots
    if (this.fleetHistory.length > 1000) {
      this.fleetHistory = this.fleetHistory.slice(-1000);
    }
    this.persist('fleet-history.json', this.fleetHistory);
  }

  getFleetTrend(lastN: number = 24): FleetSnapshot[] {
    return this.fleetHistory.slice(-lastN);
  }

  // -- Strategy records --

  recordStrategyResult(record: StrategyRecord): void {
    this.strategyHistory.push(record);
    if (this.strategyHistory.length > 5000) {
      this.strategyHistory = this.strategyHistory.slice(-5000);
    }
    this.persist('strategy-history.json', this.strategyHistory);
  }

  getStrategyHistory(strategyTag?: string, lastN: number = 100): StrategyRecord[] {
    let records = this.strategyHistory;
    if (strategyTag) {
      records = records.filter((r) => r.strategyTag === strategyTag);
    }
    return records.slice(-lastN);
  }

  getBestStrategies(): StrategyRecord[] {
    // Get latest record per strategy, sorted by hit rate
    const latest = new Map<string, StrategyRecord>();
    for (const r of this.strategyHistory) {
      latest.set(r.strategyTag, r);
    }
    return [...latest.values()].sort((a, b) => b.hitRate - a.hitRate);
  }

  // -- Optimization history --

  recordOptimization(record: OptimizationRecord): void {
    this.optimizationHistory.push(record);
    if (this.optimizationHistory.length > 500) {
      this.optimizationHistory = this.optimizationHistory.slice(-500);
    }
    this.persist('optimization-history.json', this.optimizationHistory);
  }

  getOptimizationHistory(lastN: number = 50): OptimizationRecord[] {
    return this.optimizationHistory.slice(-lastN);
  }

  getAverageSpeedup(): number {
    if (this.optimizationHistory.length === 0) return 1.0;
    const sum = this.optimizationHistory.reduce((s, r) => s + r.estimatedSpeedup, 0);
    return sum / this.optimizationHistory.length;
  }

  // -- Fingerprint knowledge --

  recordFingerprint(record: FingerprintRecord): void {
    this.fingerprintKnowledge.set(record.hash160Hex, record);
    this.persist(
      'fingerprint-knowledge.json',
      Object.fromEntries(this.fingerprintKnowledge),
    );
  }

  getFingerprint(hash160Hex: string): FingerprintRecord | undefined {
    return this.fingerprintKnowledge.get(hash160Hex);
  }

  getFingerprintCount(): number {
    return this.fingerprintKnowledge.size;
  }

  getWalletDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const fp of this.fingerprintKnowledge.values()) {
      dist[fp.walletSoftware] = (dist[fp.walletSoftware] ?? 0) + 1;
    }
    return dist;
  }

  // -- Summary for agent context --

  getSummary(): string {
    const lines: string[] = [
      `Quantum Memory Summary:`,
      `  Fleet snapshots: ${this.fleetHistory.length}`,
      `  Strategy records: ${this.strategyHistory.length}`,
      `  Optimization runs: ${this.optimizationHistory.length}`,
      `  Fingerprints known: ${this.fingerprintKnowledge.size}`,
    ];

    if (this.fleetHistory.length > 0) {
      const latest = this.fleetHistory[this.fleetHistory.length - 1]!;
      lines.push(`  Last fleet: ${latest.activeWorkers} workers, ${latest.totalKeysPerSecond.toLocaleString()} keys/s`);
    }

    const bestStrategies = this.getBestStrategies().slice(0, 3);
    if (bestStrategies.length > 0) {
      lines.push(`  Top strategies: ${bestStrategies.map((s) => `${s.strategyTag} (${(s.hitRate * 100).toFixed(3)}%)`).join(', ')}`);
    }

    const avgSpeedup = this.getAverageSpeedup();
    if (avgSpeedup > 1.0) {
      lines.push(`  Avg optimization speedup: ${avgSpeedup.toFixed(2)}x`);
    }

    return lines.join('\n');
  }

  // -- Persistence --

  private persist(filename: string, data: unknown): void {
    if (!this.dir) return;
    try {
      const filePath = path.join(this.dir, filename);
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      log.error(`Failed to persist ${filename}`, err);
    }
  }

  private loadFromDisk(): void {
    if (!this.dir) return;
    try {
      this.fleetHistory = this.loadFile('fleet-history.json') ?? [];
      this.strategyHistory = this.loadFile('strategy-history.json') ?? [];
      this.optimizationHistory = this.loadFile('optimization-history.json') ?? [];
      const fpData = this.loadFile<Record<string, FingerprintRecord>>('fingerprint-knowledge.json');
      if (fpData) {
        this.fingerprintKnowledge = new Map(Object.entries(fpData));
      }
      log.info(`Loaded memory: ${this.fleetHistory.length} fleet, ${this.strategyHistory.length} strategy, ${this.fingerprintKnowledge.size} fingerprints`);
    } catch (err) {
      log.error('Failed to load memory from disk', err);
    }
  }

  private loadFile<T>(filename: string): T | null {
    try {
      const filePath = path.join(this.dir!, filename);
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }
}
