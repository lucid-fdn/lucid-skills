// ---------------------------------------------------------------------------
// mcp.ts -- MCP server factory for Lucid Observability
// ---------------------------------------------------------------------------

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { createAllTools, type ToolParamDef } from './tools/index.js';
import { PLUGIN_NAME, PLUGIN_VERSION } from './plugin-id.js';
import { log } from './utils/logger.js';

/** Convert a ToolParamDef to a Zod schema for MCP SDK registration. */
function paramDefToZod(def: ToolParamDef): z.ZodTypeAny {
  switch (def.type) {
    case 'number':
      return z.number().describe(def.description ?? '');
    case 'boolean':
      return z.boolean().describe(def.description ?? '');
    case 'enum':
      if (def.values && def.values.length > 0) {
        return z.enum(def.values as [string, ...string[]]).describe(def.description ?? '');
      }
      return z.string().describe(def.description ?? '');
    case 'array':
      return z.array(def.items ? paramDefToZod(def.items) : z.unknown()).describe(def.description ?? '');
    case 'object':
      if (def.properties) {
        const shape: Record<string, z.ZodTypeAny> = {};
        for (const [k, v] of Object.entries(def.properties)) {
          shape[k] = v.required ? paramDefToZod(v) : paramDefToZod(v).optional();
        }
        return z.object(shape).describe(def.description ?? '');
      }
      return z.record(z.string(), z.unknown()).describe(def.description ?? '');
    default: // 'string'
      return z.string().describe(def.description ?? '');
  }
}

/** Convert tool params record to a Zod object schema for MCP tool registration. */
function toolParamsToJsonSchema(params: Record<string, ToolParamDef>): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, def] of Object.entries(params)) {
    shape[key] = def.required ? paramDefToZod(def) : paramDefToZod(def).optional();
  }
  return shape;
}

/**
 * Create and configure the Lucid Observability MCP server.
 *
 * 1. Load config from env
 * 2. Create McpServer and register all tools
 */
export function createObservabilityServer(
  env: Record<string, string | undefined> = process.env,
): McpServer {
  const config = loadConfig(env);
  log.setLevel(config.logLevel);

  const tools = createAllTools({ config });

  const server = new McpServer({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
  });

  for (const tool of tools) {
    // Dynamic Zod shape triggers TS2589 with McpServer generics — cast to satisfy overload
    const inputSchema = toolParamsToJsonSchema(tool.params) as any;
    server.tool(tool.name, tool.description, inputSchema, async (params: Record<string, unknown>) => {
      const result = await tool.execute(params);
      return { content: [{ type: 'text' as const, text: result }] };
    });
  }

  log.info(`${PLUGIN_NAME} MCP server created (${tools.length} tools)`);
  return server;
}
