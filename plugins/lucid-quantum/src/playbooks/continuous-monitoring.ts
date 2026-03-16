// ---------------------------------------------------------------------------
// playbooks/continuous-monitoring.ts -- Continuous fleet monitoring
// ---------------------------------------------------------------------------
//
// Lightweight monitoring playbook that runs frequently:
// 1. Quick health check (quantum_protect)
// 2. If CRITICAL or HIGH risk, escalate with full fleet status
// 3. Log results to memory for trend analysis
//
// Designed to run every 5-15 minutes.
// ---------------------------------------------------------------------------

import type { AdapterRegistry } from '../adapters/registry.js';
import { createBrainTools } from '../brain/tools.js';
import { findTool } from '../utils/find-tool.js';
import { log } from '../utils/logger.js';

export interface MonitoringConfig {
  registry: AdapterRegistry;
  agentPassportId?: string;
  escalateOnRisk: ('HIGH' | 'CRITICAL')[]; // Risk levels that trigger escalation
}

export async function runContinuousMonitoring(config: MonitoringConfig): Promise<string> {
  const tools = createBrainTools({
    registry: config.registry,
    agentPassportId: config.agentPassportId,
  });

  const results: string[] = [];

  // Quick health check
  const healthResult = await findTool(tools, 'quantum_protect').execute({});
  results.push(healthResult);

  // Check if escalation is needed
  const needsEscalation = config.escalateOnRisk.some((level) => healthResult.includes(level));

  if (needsEscalation) {
    log.warn('Monitoring: escalation triggered, running full fleet assessment');
    results.push('', '=== ESCALATION: FULL FLEET ASSESSMENT ===');

    const fleetResult = await findTool(tools, 'quantum_fleet').execute({});
    results.push(fleetResult);

    const costResult = await findTool(tools, 'quantum_cost').execute({});
    results.push('', costResult);
  }

  return results.join('\n');
}

/** Playbook metadata for OpenClaw registration */
export const PLAYBOOK_META = {
  id: 'continuous-monitoring',
  name: 'Continuous Fleet Monitoring',
  description:
    'Quick health check every 5-15 minutes. Escalates to full assessment if risk is HIGH or CRITICAL.',
  trigger: 'cron',
  schedule: '*/15 * * * *', // every 15 minutes
  tools: ['quantum_protect', 'quantum_fleet', 'quantum_cost'],
};
