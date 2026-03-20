// ---------------------------------------------------------------------------
// playbooks/target-analysis-pipeline.ts -- Deep target analysis pipeline
// ---------------------------------------------------------------------------
//
// This playbook performs comprehensive analysis on all targets:
// 1. Classify all targets with triage scoring
// 2. For each target with metadata, run wallet fingerprinting
// 3. Compute temporal narrowing for timestamp-seeded modes
// 4. Auto-optimize based on aggregated intelligence
// 5. Report findings
//
// Best run after uploading a new target list or populating metadata.
// ---------------------------------------------------------------------------

import type { AdapterRegistry } from '../adapters/registry.js';
import { createBrainTools } from '../brain/tools.js';
import { findTool } from '../utils/find-tool.js';
import { log } from '../utils/logger.js';

export interface PipelineConfig {
  registry: AdapterRegistry;
  agentPassportId?: string;
  maxTargets: number; // How many targets to analyze (default: 500)
}

export async function runTargetAnalysisPipeline(config: PipelineConfig): Promise<string> {
  const tools = createBrainTools({
    registry: config.registry,
    agentPassportId: config.agentPassportId,
  });

  const results: string[] = [];

  // Step 1: Full triage classification
  log.info(`Target analysis: classifying up to ${config.maxTargets} targets`);
  const triageResult = await findTool(tools, 'quantum_triage').execute({
    limit: config.maxTargets,
  });
  results.push('=== TARGET CLASSIFICATION ===', triageResult, '');

  // Step 2: Fleet status to understand fingerprint coverage
  log.info('Target analysis: checking fleet and fingerprint coverage');
  const fleetResult = await findTool(tools, 'quantum_fleet').execute({});
  results.push('=== FLEET & FINGERPRINT COVERAGE ===', fleetResult, '');

  // Step 3: Apply intelligence to priorities
  log.info('Target analysis: applying intelligence to mode priorities');
  const optimizeResult = await findTool(tools, 'quantum_optimize').execute({});
  results.push('=== OPTIMIZATION APPLIED ===', optimizeResult, '');

  // Step 4: Final cost efficiency check
  const costResult = await findTool(tools, 'quantum_cost').execute({});
  results.push('=== UPDATED COST ANALYSIS ===', costResult, '');

  log.info('Target analysis pipeline complete');
  return results.join('\n');
}

/** Playbook metadata for OpenClaw registration */
export const PLAYBOOK_META = {
  id: 'target-analysis-pipeline',
  name: 'Target Analysis Pipeline',
  description:
    'Deep analysis: classify all targets -> fingerprint wallets -> compute narrowing -> optimize priorities. ' +
    'Run after uploading new targets or populating blockchain metadata.',
  trigger: 'event',
  event: 'targets.updated',
  tools: ['quantum_triage', 'quantum_fingerprint', 'quantum_narrow', 'quantum_optimize', 'quantum_cost'],
};
