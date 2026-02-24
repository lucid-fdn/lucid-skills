// ---------------------------------------------------------------------------
// adapters.test.ts -- Tests for tool adapters
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from 'vitest';
import { withErrorHandling, toMcpToolList } from '../../src/tools/adapters.js';
import { ok } from '../../src/tools/types.js';
import { InvoiceError, ValidationError, NotFoundError } from '../../src/core/errors.js';
import type { ToolDefinition } from '../../src/tools/types.js';
import { z } from 'zod';

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'test_tool',
    description: 'A test tool',
    inputSchema: z.object({}),
    handler: async () => ok('success'),
    ...overrides,
  };
}

describe('withErrorHandling', () => {
  it('passes through successful results', async () => {
    const tool = makeTool();
    const wrapped = withErrorHandling(tool);
    const result = await wrapped.handler({});
    expect(result.content[0]!.text).toBe('success');
    expect(result.isError).toBeUndefined();
  });

  it('catches InvoiceError and returns error result', async () => {
    const tool = makeTool({
      handler: async () => {
        throw new ValidationError('bad input');
      },
    });
    const wrapped = withErrorHandling(tool);
    const result = await wrapped.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('bad input');
  });

  it('catches NotFoundError and returns error result', async () => {
    const tool = makeTool({
      handler: async () => {
        throw new NotFoundError('Client', 'abc');
      },
    });
    const wrapped = withErrorHandling(tool);
    const result = await wrapped.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Client not found');
  });

  it('catches generic errors and returns unexpected error', async () => {
    const tool = makeTool({
      handler: async () => {
        throw new Error('boom');
      },
    });
    const wrapped = withErrorHandling(tool);
    const result = await wrapped.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Unexpected error');
    expect(result.content[0]!.text).toContain('boom');
  });

  it('catches non-Error throws', async () => {
    const tool = makeTool({
      handler: async () => {
        throw 'string error';
      },
    });
    const wrapped = withErrorHandling(tool);
    const result = await wrapped.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('string error');
  });

  it('preserves tool name and description', () => {
    const tool = makeTool({ name: 'my_tool', description: 'My tool desc' });
    const wrapped = withErrorHandling(tool);
    expect(wrapped.name).toBe('my_tool');
    expect(wrapped.description).toBe('My tool desc');
  });
});

describe('toMcpToolList', () => {
  it('converts tool definitions to MCP format', () => {
    const tools = [makeTool({ name: 't1', description: 'Tool 1' })];
    const mcpTools = toMcpToolList(tools);
    expect(mcpTools).toHaveLength(1);
    expect(mcpTools[0]!.name).toBe('t1');
    expect(mcpTools[0]!.description).toBe('Tool 1');
    expect(mcpTools[0]!.inputSchema).toBeDefined();
  });

  it('returns object type for inputSchema', () => {
    const tools = [makeTool()];
    const mcpTools = toMcpToolList(tools);
    expect(mcpTools[0]!.inputSchema.type).toBe('object');
  });

  it('handles empty tool list', () => {
    expect(toMcpToolList([])).toHaveLength(0);
  });
});
