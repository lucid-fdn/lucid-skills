// ---------------------------------------------------------------------------
// tools/index.ts -- Tool registry for Lucid Trade MCP
// ---------------------------------------------------------------------------

import type { PluginConfig } from '../config.js';
import type { AdapterRegistry } from '../adapters/registry.js';
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
  registry: AdapterRegistry;
}

// -- Create all tools --------------------------------------------------------

/**
 * Instantiate every tool the trade MCP exposes.
 *
 * Brain tools (lucid_think, lucid_scan, etc.) are the primary interface.
 * Granular TA tools are accessible via lucid_pro escape hatch.
 */
export function createAllTools(deps: ToolDependencies): ToolDefinition[] {
  return [
    ...createBrainTools({
      registry: deps.registry,
      portfolioValue: 10_000, // default, overridden by memory layer later
      riskPct: 2, // default
    }),
  ];
}
