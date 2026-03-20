// ---------------------------------------------------------------------------
// Lucid Invoice — Tool Types
// ---------------------------------------------------------------------------

import { z } from 'zod';

/** Standard tool result shape returned to the MCP runtime. */
export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/** Helper to build a successful text result. */
export function ok(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
  };
}

/** Helper to build an error text result. */
export function err(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}

/** A registered tool definition. */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: unknown) => Promise<ToolResult>;
}
