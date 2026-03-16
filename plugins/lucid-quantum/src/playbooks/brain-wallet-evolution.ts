// ---------------------------------------------------------------------------
// playbooks/brain-wallet-evolution.ts -- Brain wallet strategy evolution
// ---------------------------------------------------------------------------
//
// This playbook manages the brain wallet strategy lifecycle:
// 1. Review current strategy performance (hit rates, trends)
// 2. Identify underperforming strategies for retirement
// 3. Identify promising strategies for scaling
// 4. Generate recommendations for new strategy directions
//
// Designed for AI agents that generate and test passphrase candidates.
// ---------------------------------------------------------------------------

import type { AdapterRegistry } from '../adapters/registry.js';
import { createBrainTools } from '../brain/tools.js';
import { findTool } from '../utils/find-tool.js';
import { log } from '../utils/logger.js';

export interface EvolutionConfig {
  registry: AdapterRegistry;
  agentPassportId?: string;
  minCandidatesForEval: number; // Min candidates before evaluating (default: 1000)
}

export async function runBrainWalletEvolution(config: EvolutionConfig): Promise<string> {
  const tools = createBrainTools({
    registry: config.registry,
    agentPassportId: config.agentPassportId,
  });

  const results: string[] = [];

  // Step 1: Get strategy performance
  log.info('Brain wallet evolution: reviewing strategy performance');
  const strategyResult = await findTool(tools, 'quantum_brain').execute({});
  results.push('=== STRATEGY PERFORMANCE ===', strategyResult, '');

  // Step 2: Fleet context (to understand current search state)
  const fleetResult = await findTool(tools, 'quantum_fleet').execute({});
  results.push('=== FLEET CONTEXT ===', fleetResult, '');

  // Step 3: Generate evolution recommendations
  results.push('=== EVOLUTION RECOMMENDATIONS ===');
  results.push('Based on the analysis above, the agent should:');
  results.push('1. Scale up strategies with hit rate > 0.001% by submitting larger batches');
  results.push('2. Retire strategies with 0 hits after 100K+ candidates');
  results.push('3. Try new strategies combining successful patterns:');
  results.push('   - Combine top-performing wordlists with number suffixes');
  results.push('   - Use temporal context (year-specific passphrases for 2009-2011)');
  results.push('   - Test multilingual passphrases (early Bitcoin was global)');
  results.push('4. Focus on modes with high triage scores for targeted brain wallet testing');
  results.push('');

  log.info('Brain wallet evolution complete');
  return results.join('\n');
}

/** Playbook metadata for OpenClaw registration */
export const PLAYBOOK_META = {
  id: 'brain-wallet-evolution',
  name: 'Brain Wallet Strategy Evolution',
  description:
    'Review brain wallet strategy performance, retire underperformers, scale winners, ' +
    'and recommend new strategy directions. Run weekly.',
  trigger: 'cron',
  schedule: '0 0 * * 0', // weekly (Sunday midnight)
  tools: ['quantum_brain', 'quantum_fleet', 'quantum_triage'],
};
