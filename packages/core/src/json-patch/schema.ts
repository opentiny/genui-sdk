import { z } from 'zod';

const jsonPointerBaseSchema = z
  .string()
  .regex(
    /^(?:|(?:\/(?:[^~/]|~[01])*)+)$/,
    'Invalid JSON Pointer format. Must start with "/" and use ~0, ~1 for escaping.',
  );

function jsonPointerHasAppendSentinel(pointer: string): boolean {
  if (pointer === '') return false;
  return pointer
    .slice(1)
    .split('/')
    .some((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~') === '-');
}

const jsonPointerSchemaAdd = jsonPointerBaseSchema.describe(
  "RFC 6901 Pointer relative to the target component. Use '/-' only as the last segment to append to an array.",
);

const jsonPointerSchemaExisting = jsonPointerBaseSchema
  .refine(
    (pointer) => !jsonPointerHasAppendSentinel(pointer),
    'Invalid JSON Pointer: "-" is only valid for op "add".',
  )
  .describe('RFC 6901 Pointer relative to an existing value in the target component.');

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type JsonValue = z.infer<typeof literalSchema> | { [key: string]: JsonValue } | JsonValue[];
const jsonPatchValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonPatchValueSchema), z.record(jsonPatchValueSchema)]),
);

const baseOperationSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe('Target component id from the current UI schema.'),
});

const addOperation = z
  .object({
    op: z.literal('add'),
    path: jsonPointerSchemaAdd,
    value: jsonPatchValueSchema.describe('Value to add at the specified path.'),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe('Adds a property or inserts a value relative to the component identified by id.');

const removeOperation = z
  .object({
    op: z.literal('remove'),
    path: jsonPointerSchemaExisting
      .optional()
      .describe('JSON Pointer relative to id. Empty or omitted names the component itself.'),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe('Removes the location identified by id and path. Omit path to remove the component itself.');

const replaceOperation = z
  .object({
    op: z.literal('replace'),
    path: jsonPointerSchemaExisting
      .optional()
      .describe('JSON Pointer relative to id. Empty or omitted names the component itself.'),
    value: jsonPatchValueSchema.describe('Replacement value.'),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe('Replaces the location identified by id and path. Omit path to replace the component itself.');

const moveOperation = z
  .object({
    op: z.literal('move'),
    positionId: z.string().min(1).describe('Existing anchor component id from the current UI schema.'),
    position: z.enum(['before', 'after', 'inside']).describe('Position relative to positionId.'),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe('Moves the component identified by id relative to positionId.');

const testOperation = z
  .object({
    op: z.literal('test'),
    path: jsonPointerSchemaExisting,
    value: jsonPatchValueSchema.describe('Expected value.'),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe('Tests a value relative to the component identified by id.');

export const jsonPatchOperationSchema = z.discriminatedUnion('op', [
  addOperation,
  removeOperation,
  replaceOperation,
  moveOperation,
  testOperation,
]);

export const jsonPatchSchema = z
  .array(jsonPatchOperationSchema)
  .describe('Ordered UI schema patch operations. The syntax is based on RFC 6902 with component-id extensions.');

export type JsonPatchOperation = z.infer<typeof jsonPatchOperationSchema>;
export type JsonPatch = z.infer<typeof jsonPatchSchema>;
