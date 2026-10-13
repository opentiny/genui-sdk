import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { ISchemaManualEditRecord, ISchemaManualMessageItem } from '../chat.types';
import { isManualSchemaSaveMessage } from './context-message';

export function getManualEdits(card: ISchemaManualMessageItem): ISchemaManualEditRecord[] {
  if (card.edits?.length) {
    return card.edits;
  }
  return [
    {
      editId: card.cardId,
      schema: card.schema,
      prevSchema: card.prevSchema,
      generatedTime: card.generatedTime,
      input: card.input,
      inputType: card.inputType,
    },
  ];
}

export function manualEditToCardSnapshot(
  card: ISchemaManualMessageItem,
  edit: ISchemaManualEditRecord,
): ISchemaManualMessageItem {
  return {
    ...card,
    content: edit.schema,
    schema: edit.schema,
    prevSchema: edit.prevSchema,
    generatedTime: edit.generatedTime,
    input: edit.input,
    inputType: edit.inputType,
  };
}

export function findManualCardInMessages(
  messages: ChatMessage[] | undefined,
  cardOrEditId: string,
): ISchemaManualMessageItem | null {
  if (!messages?.length || !cardOrEditId) {
    return null;
  }

  for (const chatMessage of messages) {
    const items = (chatMessage as { messages?: ISchemaManualMessageItem[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    for (const item of items) {
      if (item.type !== 'schema-manual') {
        continue;
      }
      if (item.cardId === cardOrEditId) {
        return item;
      }
      if (item.edits?.some((edit) => edit.editId === cardOrEditId)) {
        return item;
      }
    }
  }

  return null;
}

export function getMergeableManualSaveMessage(
  messages: ChatMessage[] | undefined,
): { message: ChatMessage; card: ISchemaManualMessageItem } | null {
  if (!messages?.length) {
    return null;
  }

  const lastMessage = messages[messages.length - 1];
  if (!isManualSchemaSaveMessage(lastMessage)) {
    return null;
  }

  const card = (lastMessage as { messages?: ISchemaManualMessageItem[] }).messages?.find(
    (item) => item.type === 'schema-manual',
  );
  if (card) {
    return { message: lastMessage, card };
  }

  return null;
}

export function syncManualCardLatestFields(card: ISchemaManualMessageItem): void {
  const edits = getManualEdits(card);
  const latest = edits[edits.length - 1];
  card.content = latest.schema;
  card.schema = latest.schema;
  card.generatedTime = latest.generatedTime;
  card.input = latest.input;
  card.inputType = latest.inputType;
  card.prevSchema = edits[0].prevSchema;
  card.edits = edits;
}
