import { describe, it, expect } from 'vitest';
import { toZodSchema } from '../../src/adapters/zod-schema.js';
import type { ToolParamDef } from '../../src/core/tools/types.js';

describe('Zod Schema Adapter', () => {
  it('should convert string param', () => {
    const params: Record<string, ToolParamDef> = {
      name: { type: 'string', required: true, description: 'A name' },
    };
    const schema = toZodSchema(params);
    const result = schema.safeParse({ name: 'test' });
    expect(result.success).toBe(true);
  });

  it('should convert number param with min/max', () => {
    const params: Record<string, ToolParamDef> = {
      age: { type: 'number', required: true, min: 0, max: 150 },
    };
    const schema = toZodSchema(params);

    expect(schema.safeParse({ age: 25 }).success).toBe(true);
    expect(schema.safeParse({ age: -1 }).success).toBe(false);
    expect(schema.safeParse({ age: 200 }).success).toBe(false);
  });

  it('should convert boolean param', () => {
    const params: Record<string, ToolParamDef> = {
      active: { type: 'boolean', required: true },
    };
    const schema = toZodSchema(params);
    expect(schema.safeParse({ active: true }).success).toBe(true);
    expect(schema.safeParse({ active: 'yes' }).success).toBe(false);
  });

  it('should convert enum param', () => {
    const params: Record<string, ToolParamDef> = {
      status: { type: 'enum', required: true, values: ['active', 'inactive'] },
    };
    const schema = toZodSchema(params);
    expect(schema.safeParse({ status: 'active' }).success).toBe(true);
    expect(schema.safeParse({ status: 'deleted' }).success).toBe(false);
  });

  it('should handle optional params', () => {
    const params: Record<string, ToolParamDef> = {
      name: { type: 'string', required: true },
      nickname: { type: 'string', required: false },
    };
    const schema = toZodSchema(params);
    expect(schema.safeParse({ name: 'test' }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('should convert object param with properties', () => {
    const params: Record<string, ToolParamDef> = {
      address: {
        type: 'object',
        required: true,
        properties: {
          street: { type: 'string', required: true },
          city: { type: 'string', required: true },
        },
      },
    };
    const schema = toZodSchema(params);
    expect(schema.safeParse({ address: { street: '123 Main', city: 'SF' } }).success).toBe(true);
  });

  it('should convert array param', () => {
    const params: Record<string, ToolParamDef> = {
      tags: {
        type: 'array',
        required: true,
        items: { type: 'string' },
      },
    };
    const schema = toZodSchema(params);
    expect(schema.safeParse({ tags: ['a', 'b'] }).success).toBe(true);
  });
});
