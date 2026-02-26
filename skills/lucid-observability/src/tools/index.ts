// ---------------------------------------------------------------------------
// tools/index.ts -- Tool registry for Lucid Observability MCP
// ---------------------------------------------------------------------------

import type { PluginConfig } from '../config.js';
import { createBrainTools } from '../brain/tools.js';

// -- Tool type definitions ---------------------------------------------------

export type ParamType = 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';

export interface ToolParamDef {
  type: ParamType;
  required?: boolean;
  description?: string;
  values?: string[];
  min?: number;
  max?: number;
  default?: unknown;
  properties?: Record<string, ToolParamDef>;
  items?: ToolParamDef;
}

export interface ToolDefinition<T = any> {
  name: string;
  description: string;
  params: Record<string, ToolParamDef>;
  execute: (params: T) => Promise<string>;
}

// -- Tool dependencies -------------------------------------------------------

export interface ToolDependencies {
  config: PluginConfig;
}

// -- Create all tools --------------------------------------------------------

/**
 * Instantiate every tool the observability MCP exposes.
 * Brain tools (lucid_triage, lucid_readiness, etc.) are the primary interface.
 * Granular math tools are accessible via lucid_obs_pro escape hatch.
 */
export function createAllTools(deps: ToolDependencies): ToolDefinition[] {
  return [
    ...createBrainTools({
      config: deps.config,
    }),
  ];
}
