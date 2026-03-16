// ---------------------------------------------------------------------------
// index.ts -- Barrel re-export for all tool definitions
// ---------------------------------------------------------------------------

import type { ToolDefinition } from './types.js';
import type { PluginConfig, Fetcher, MonitorType, Notifier, NotifierType } from '../types/index.js';
import {
  createAddCompetitorTool,
  createListCompetitorsTool,
  createUpdateCompetitorTool,
  createRemoveCompetitorTool,
} from './manage-competitors.js';
import {
  createAddMonitorTool,
  createListMonitorsTool,
  createRemoveMonitorTool,
} from './manage-monitors.js';
import { createFetchNowTool } from './fetch-now.js';
import { createListSignalsTool } from './list-signals.js';
import { createGenerateBattlecardTool } from './generate-battlecard.js';
import { createGenerateBriefTool } from './generate-brief.js';
import { createSearchTool } from './search.js';
import { createStatusTool } from './status.js';

export interface ToolDependencies {
  config: PluginConfig;
  fetcherRegistry: Map<MonitorType, Fetcher>;
  notifierRegistry: Map<NotifierType, Notifier>;
}

/**
 * Create all 13 compete tools with the given dependencies.
 */
export function createAllTools(deps: ToolDependencies): ToolDefinition[] {
  return [
    createAddCompetitorTool(deps),
    createListCompetitorsTool(deps),
    createUpdateCompetitorTool(deps),
    createRemoveCompetitorTool(deps),
    createAddMonitorTool(deps),
    createListMonitorsTool(deps),
    createRemoveMonitorTool(deps),
    createFetchNowTool(deps),
    createListSignalsTool(deps),
    createGenerateBattlecardTool(deps),
    createGenerateBriefTool(deps),
    createSearchTool(deps),
    createStatusTool(deps),
  ];
}

// Re-export types
export type { ToolDefinition, ToolParamDef } from './types.js';

// Re-export factories
export {
  createAddCompetitorTool,
  createListCompetitorsTool,
  createUpdateCompetitorTool,
  createRemoveCompetitorTool,
} from './manage-competitors.js';
export {
  createAddMonitorTool,
  createListMonitorsTool,
  createRemoveMonitorTool,
} from './manage-monitors.js';
export { createFetchNowTool } from './fetch-now.js';
export { createListSignalsTool } from './list-signals.js';
export { createGenerateBattlecardTool } from './generate-battlecard.js';
export { createGenerateBriefTool } from './generate-brief.js';
export { createSearchTool } from './search.js';
export { createStatusTool } from './status.js';
