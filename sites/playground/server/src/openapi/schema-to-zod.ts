import { z, type ZodTypeAny } from 'zod';
import type { OpenAPIV3 } from 'openapi-types';
import { jsonSchemaToZod, type JsonSchema } from 'json-schema-to-zod';

type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;

function compileJsonSchemaToZod(schema: JsonSchema): ZodTypeAny {
  return new Function('z', `return ${jsonSchemaToZod(schema)}`)(z) as ZodTypeAny;
}

function schemaToZod(schema: SchemaObject | ReferenceObject | undefined, required = true): ZodTypeAny {
  if (!schema || '$ref' in schema) {
    return required ? z.string() : z.string().optional();
  }

  let result = compileJsonSchemaToZod(schema as JsonSchema);
  if (!required) {
    result = result.optional();
  }
  return result;
}

export function parametersToZodShape(parameters: { name: string; schema: SchemaObject; required: boolean; description?: string }[]) {
  const shape: Record<string, ZodTypeAny> = {};

  for (const param of parameters) {
    let field = schemaToZod(param.schema, param.required);
    if (param.description) {
      field = field.describe(param.description);
    }
    shape[param.name] = field;
  }

  return shape;
}

export function requestBodyToZodField(
  schema: SchemaObject | undefined,
  required: boolean,
): Record<string, ZodTypeAny> {
  if (!schema) return {};
  return { body: schemaToZod(schema, required) };
}
