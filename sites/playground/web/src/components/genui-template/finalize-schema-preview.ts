import { generateIdForComponents } from './template-chat-utils/schema-id-generator';

interface SchemaPreviewFinalization {
  setCurrentPreviewSchema: (schema: Record<string, unknown>, isComplete?: boolean) => void;
  setCurrentSchema: (schema: Record<string, unknown>) => void;
}

export function finalizeSchemaPreview(
  preview: Record<string, unknown>,
  target: SchemaPreviewFinalization,
) {
  generateIdForComponents(preview);
  // Streaming stores the preview in a shallowRef. Publishing a new root object
  // makes the renderer consume the ids generated above before inspect mode is used.
  const finalized = { ...preview };
  target.setCurrentPreviewSchema(finalized, true);
  target.setCurrentSchema(finalized);
  return finalized;
}
