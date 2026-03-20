import { describe, it, expect } from 'vitest';
import { toTypeBoxSchema } from '../../src/adapters/typebox-schema.js';
import { Value } from '@sinclair/typebox/value';
import type { ToolParamDef } from '../../src/core/tools/types.js';

describe('TypeBox Schema Adapter', () => {
  it('should convert string param', () => {
    const params: Record<string, ToolParamDef> = {
      name: { type: 'string', required: true },
    };
    const schema = toTypeBoxSchema(params);
    expect(Value.Check(schema, { name: 'test' })).toBe(true);
  });

  it('should convert number param with constraints', () => {
    const params: Record<string, ToolParamDef> = {
      score: { type: 'number', required: true, min: 0, max: 100 },
    };
    const schema = toTypeBoxSchema(params);
    expect(Value.Check(schema, { score: 50 })).toBe(true);
    expect(Value.Check(schema, { score: -1 })).toBe(false);
  });

  it('should handle optional params', () => {
    const params: Record<string, ToolParamDef> = {
      name: { type: 'string', required: true },
      bio: { type: 'string', required: false },
    };
    const schema = toTypeBoxSchema(params);
    expect(Value.Check(schema, { name: 'test' })).toBe(true);
  });

  it('should convert enum param', () => {
    const params: Record<string, ToolParamDef> = {
      role: { type: 'enum', required: true, values: ['admin', 'user'] },
    };
    const schema = toTypeBoxSchema(params);
    expect(Value.Check(schema, { role: 'admin' })).toBe(true);
    expect(Value.Check(schema, { role: 'superuser' })).toBe(false);
  });
});
