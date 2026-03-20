import type { ToolParamDef } from '../core/tools/types.js';

// TypeBox-compatible schema builder (no runtime dependency on TypeBox)
// Returns plain JSON Schema objects that are compatible with TypeBox

interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  description?: string;
  additionalProperties?: boolean;
}

function paramToJsonSchema(def: ToolParamDef): JsonSchema {
  const schema: JsonSchema = {};

  switch (def.type) {
    case 'string':
      schema.type = 'string';
      break;
    case 'number':
      schema.type = 'number';
      if (def.min !== undefined) schema.minimum = def.min;
      if (def.max !== undefined) schema.maximum = def.max;
      break;
    case 'boolean':
      schema.type = 'boolean';
      break;
    case 'enum':
      schema.type = 'string';
      schema.enum = def.values;
      break;
    case 'object':
      schema.type = 'object';
      if (def.properties) {
        const nested = toTypeBoxSchema(def.properties);
        schema.properties = nested.properties;
        schema.required = nested.required;
      }
      break;
    case 'array':
      schema.type = 'array';
      if (def.items) schema.items = paramToJsonSchema(def.items);
      break;
  }

  if (def.description) schema.description = def.description;
  return schema;
}

export function toTypeBoxSchema(
  params: Record<string, ToolParamDef>,
): { type: string; properties: Record<string, JsonSchema>; required: string[]; additionalProperties: boolean } {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const [key, def] of Object.entries(params)) {
    properties[key] = paramToJsonSchema(def);
    if (def.required !== false) {
      required.push(key);
    }
  }

  return { type: 'object', properties, required, additionalProperties: false };
}
