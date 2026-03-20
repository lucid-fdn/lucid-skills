// ---------------------------------------------------------------------------
// utils/find-tool.ts -- Shared tool lookup helper
// ---------------------------------------------------------------------------

import type { ToolDefinition } from '../tools/index.js';

/**
 * Find a tool by name from a tools array with a clear error if missing.
 * Replaces scattered non-null assertions (`tools.find(...)!`).
 */
export function findTool(tools: ToolDefinition[], name: string): ToolDefinition {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`[quantum] Tool "${name}" not found. Available: ${tools.map((t) => t.name).join(', ')}`);
  }
  return tool;
}
