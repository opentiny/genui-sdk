import { ref } from 'vue';
import {
  textToJson,
  validateJsonPatch,
  PARSE_PARTIAL_JSON_STATE,
  applyJsonPatchOperations,
  generateIdForComponents,
} from '../template-chat-utils';
import { clonePlainJson } from '../template-chat-utils/json-patch-format';
import { stripSchemaFieldsWhileStreaming } from '../../../utils';
import { useTemplateSchema } from './use-template-schema';

const errorMessagesMap = ref(new Map<string, string>());
const lastPreviewSchema = ref<Record<string, unknown> | null>(null);

async function schemaCardRenderer(props: {
  content: string;
  cardId: string;
}) {
  const {
    currentPreviewSchema,
    currentCardId,
    setCurrentPreviewSchema,
  } = useTemplateSchema();

  try {
    const { content, cardId } = props;

    if (cardId !== currentCardId.value) {
      return;
    }

    if (typeof content !== 'string' || !content) {
      return;
    }

    const { value, state } = await textToJson(content);
    const isCompleted = state === PARSE_PARTIAL_JSON_STATE.SUCCESSFUL_PARSE;
    if (!value) {
      return;
    }

    const json = stripSchemaFieldsWhileStreaming(value as Record<string, unknown>, isCompleted);
    const schemaWithId = generateIdForComponents(json, {
      previousSchema: currentPreviewSchema.value,
    });
    setCurrentPreviewSchema(schemaWithId, isCompleted);
  } catch (error) {
    console.error('schemaCardRenderer error ===>', error);
    errorMessagesMap.value.set(props.cardId, (error as Error).message);
  }
}

function isStreamOperation(operation: Record<string, unknown>) {
  return (
    (operation.op === 'add' || operation.op === 'replace')
    && typeof operation.id === 'string' && operation.id !== ''
    && typeof operation.path === 'string' && operation.path !== ''
    && 'value' in operation
  );
}

async function jsonPatchRenderer(props: {
  content: string;
  cardId: string;
  newMessage?: boolean;
}) {
  const {
    currentSchema,
    currentPreviewSchema,
    currentCardId,
    setCurrentSchema,
    setCurrentPreviewSchema,
  } = useTemplateSchema();

  try {
    const { content, cardId, newMessage } = props;

    if (cardId !== currentCardId.value) {
      return;
    }
    if (newMessage) {
      lastPreviewSchema.value = clonePlainJson(currentPreviewSchema.value);
    }

    const { value, state } = await textToJson(content);
    if (state !== PARSE_PARTIAL_JSON_STATE.SUCCESSFUL_PARSE
      && state !== PARSE_PARTIAL_JSON_STATE.REPAIRED_PARSE
    ) {
      return;
    }
    const isSuccessfulParse = state === PARSE_PARTIAL_JSON_STATE.SUCCESSFUL_PARSE;
    let lastOperationComplete = true;

    const valid = validateJsonPatch(value as never);
    if (!valid) {
      return;
    }

    const operations = [...(value as Record<string, unknown>[])];
    if (!isSuccessfulParse) {
      const lastOperation = operations[operations.length - 1];
      if (!isStreamOperation(lastOperation)) {
        operations.pop();
        lastOperationComplete = true;
      } else {
        lastOperationComplete = false;
      }
    }
    if (operations.length === 0) {
      return;
    }

    const patchBaseline = lastPreviewSchema.value ?? clonePlainJson(currentSchema.value);
    if (!patchBaseline) {
      return;
    }

    const targetSchema = applyJsonPatchOperations(patchBaseline, operations as never[]);
    if (!targetSchema) {
      return;
    }

    const isStreamComplete = isSuccessfulParse || lastOperationComplete;
    const strippedSchema = stripSchemaFieldsWhileStreaming(targetSchema, isStreamComplete);

    setCurrentPreviewSchema(
      generateIdForComponents(strippedSchema, { previousSchema: currentPreviewSchema.value }),
      isStreamComplete,
    );
    if (isStreamComplete) {
      setCurrentSchema(targetSchema);
    }
  } catch (error) {
    errorMessagesMap.value.set(props.cardId, (error as Error).message);
    console.error('jsonPatch error ===>', error);
  }
}

function handleSchemaJsonChanged(event: {
  type: 'schema-card' | 'json-patch';
  cardId: string;
  content: string;
  newMessage: boolean;
}) {
  const { type, cardId, content, newMessage } = event;
  if (type === 'schema-card') {
    schemaCardRenderer({ content, cardId });
    return;
  }
  if (type === 'json-patch') {
    jsonPatchRenderer({ content, cardId, newMessage });
  }
}

function resetLastPreviewSchema(schema: Record<string, unknown> | null) {
  lastPreviewSchema.value = schema;
}

export function useTemplateStreamRender() {
  return {
    errorMessagesMap,
    lastPreviewSchema,
    handleSchemaJsonChanged,
    resetLastPreviewSchema,
  };
}
