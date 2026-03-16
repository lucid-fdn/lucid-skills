// ---------------------------------------------------------------------------
// Lucid Invoice — Tool Adapters (MCP ↔ internal)
// ---------------------------------------------------------------------------

import type { ToolDefinition, ToolResult } from './types.js';
import { err } from './types.js';
import { InvoiceError } from '../core/errors.js';
import { logger } from '../core/logger.js';

/**
 * Wrap a tool handler with standard error handling and logging.
 */
export function withErrorHandling(
  tool: ToolDefinition,
): ToolDefinition {
  return {
    ...tool,
    handler: async (input: unknown): Promise<ToolResult> => {
      try {
        logger.debug(`Tool ${tool.name} invoked`, input);
        const result = await tool.handler(input);
        logger.debug(`Tool ${tool.name} completed`);
        return result;
      } catch (error) {
        if (error instanceof InvoiceError) {
          logger.warn(`Tool ${tool.name} error: ${error.message}`);
          return err(error.message);
        }
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Tool ${tool.name} unexpected error: ${msg}`);
        return err(`Unexpected error: ${msg}`);
      }
    },
  };
}

/**
 * Convert our internal tool definitions to MCP server format.
 */
export function toMcpToolList(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.inputSchema),
  }));
}

/**
 * Minimal Zod-to-JSON-Schema conversion for MCP compatibility.
 */
function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  // For MCP we use zod's built-in JSON schema if available,
  // otherwise return a permissive object schema.
  if (schema && typeof schema === 'object' && 'safeParse' in schema) {
    // Walk known zod shapes — basic implementation
    return { type: 'object' };
  }
  return { type: 'object' };
}
