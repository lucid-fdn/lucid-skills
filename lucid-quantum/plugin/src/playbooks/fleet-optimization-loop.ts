// ---------------------------------------------------------------------------
// playbooks/fleet-optimization-loop.ts -- Autonomous fleet optimization
// ---------------------------------------------------------------------------
//
// This playbook runs a continuous optimization loop:
// 1. Check fleet health (quantum_protect)
// 2. Classify targets (quantum_triage)
// 3. Run auto-optimization (quantum_optimize)
// 4. Review results (quantum_review)
// 5. Sleep and repeat
//
// Designed for OpenClaw autonomous agents.
// ---------------------------------------------------------------------------

import type { AdapterRegistry } from '../adapters/registry.js';
import { createBrainTools } from '../brain/tools.js';
import { findTool } from '../utils/find-tool.js';
import { log } from '../utils/logger.js';

export interface PlaybookConfig {
  registry: AdapterRegistry;
  intervalMs: number; // How often to run the loop (default: 1 hour)
  agentPassportId?: string;
}

export async function runFleetOptimizationLoop(config: PlaybookConfig): Promise<string> {
  const tools = createBrainTools({
    registry: config.registry,
    agentPassportId: config.agentPassportId,
  });

  const results: string[] = [];

  // Step 1: Health check
  log.info('Fleet optimization: running health check');
  const healthResult = await findTool(tools, 'quantum_protect').execute({});
  results.push('=== HEALTH CHECK ===', healthResult, '');

  // Step 2: Target triage
  log.info('Fleet optimization: classifying targets');
  const triageResult = await findTool(tools, 'quantum_triage').execute({ limit: 200 });
  results.push('=== TARGET TRIAGE ===', triageResult, '');

  // Step 3: Auto-optimize priorities
  log.info('Fleet optimization: running auto-optimize');
  const optimizeResult = await findTool(tools, 'quantum_optimize').execute({});
  results.push('=== AUTO-OPTIMIZE ===', optimizeResult, '');

  // Step 4: Cost analysis
  log.info('Fleet optimization: analyzing costs');
  const costResult = await findTool(tools, 'quantum_cost').execute({});
  results.push('=== COST ANALYSIS ===', costResult, '');

  // Step 5: Review
  log.info('Fleet optimization: generating review');
  const reviewResult = await findTool(tools, 'quantum_review').execute({});
  results.push('=== REVIEW ===', reviewResult, '');

  log.info('Fleet optimization loop complete');
  return results.join('\n');
}

/** Playbook metadata for OpenClaw registration */
export const PLAYBOOK_META = {
  id: 'fleet-optimization-loop',
  name: 'Fleet Optimization Loop',
  description:
    'Autonomous loop: health check -> triage targets -> optimize mode priorities -> cost analysis -> review. ' +
    'Run hourly for continuous GPU fleet optimization.',
  trigger: 'cron',
  schedule: '0 * * * *', // hourly
  tools: ['quantum_protect', 'quantum_triage', 'quantum_optimize', 'quantum_cost', 'quantum_review'],
};
