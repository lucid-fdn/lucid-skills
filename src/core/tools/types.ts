import { z } from 'zod';

/**
 * Standard MCP tool result shape.
 * The index signature is required for compatibility with the MCP SDK.
 */
export interface ToolResult {
  [key: string]: unknown;
  content: ToolContent[];
  isError?: boolean;
}

export interface ToolContent {
  type: 'text';
  text: string;
}

/**
 * Helper to build a successful text result.
 */
export function ok(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

/**
 * Helper to build an error result.
 */
export function err(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

/**
 * Tool definition for registration with the MCP server.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (args: unknown) => Promise<ToolResult>;
}
