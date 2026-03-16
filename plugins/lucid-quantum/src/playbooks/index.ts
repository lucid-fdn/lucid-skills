// ---------------------------------------------------------------------------
// playbooks/index.ts -- Barrel export for all OpenClaw playbooks
// ---------------------------------------------------------------------------

export { runFleetOptimizationLoop, PLAYBOOK_META as FLEET_OPTIMIZATION_META } from './fleet-optimization-loop.js';
export type { PlaybookConfig as FleetOptimizationConfig } from './fleet-optimization-loop.js';

export { runTargetAnalysisPipeline, PLAYBOOK_META as TARGET_ANALYSIS_META } from './target-analysis-pipeline.js';
export type { PipelineConfig as TargetAnalysisConfig } from './target-analysis-pipeline.js';

export { runBrainWalletEvolution, PLAYBOOK_META as BRAIN_WALLET_META } from './brain-wallet-evolution.js';
export type { EvolutionConfig as BrainWalletConfig } from './brain-wallet-evolution.js';

export { runContinuousMonitoring, PLAYBOOK_META as MONITORING_META } from './continuous-monitoring.js';
export type { MonitoringConfig } from './continuous-monitoring.js';

/** All playbook metadata for OpenClaw plugin registration */
export const ALL_PLAYBOOKS = [
  { id: 'fleet-optimization-loop', schedule: '0 * * * *', description: 'Hourly fleet optimization loop' },
  { id: 'target-analysis-pipeline', trigger: 'targets.updated', description: 'Deep target analysis on update' },
  { id: 'brain-wallet-evolution', schedule: '0 0 * * 0', description: 'Weekly brain wallet strategy review' },
  { id: 'continuous-monitoring', schedule: '*/15 * * * *', description: 'Continuous fleet health monitoring' },
];
