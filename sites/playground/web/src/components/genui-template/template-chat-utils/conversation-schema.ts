import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IJsonPatchMessageItem, ISchemaCardMessageItem, ISchemaManualMessageItem } from '../chat.types';
import { formatDate } from '../../../utils';
import { applyJsonPatchOperations } from './json-patch-format';
import { getManualEdits, manualEditToCardSnapshot } from './manual-schema';

export type ISchemaCardLikeMessage =
  | ISchemaCardMessageItem
  | IJsonPatchMessageItem
  | ISchemaManualMessageItem;

export interface ILatestSchemaInConversation {
  schema: string;
  cardId: string;
  prevSchema: string;
  cardMessage: ISchemaCardLikeMessage;
}

export function isRenderableSchema(schema: unknown): schema is Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    return false;
  }
  const node = schema as Record<string, unknown>;
  if (typeof node.componentName === 'string' && node.componentName.length > 0) {
    return true;
  }
  return Array.isArray(node.children) && node.children.length > 0;
}

export function resolveSchemaStringFromCard(card: ISchemaCardLikeMessage): string | null {
  if (card.schema?.trim()) {
    return card.schema;
  }
  if ((card.type === 'schema-card' || card.type === 'schema-manual') && card.content?.trim()) {
    return card.content;
  }
  if (card.type === 'schema-manual') {
    const edits = getManualEdits(card);
    const latestEditSchema = edits[edits.length - 1]?.schema;
    if (latestEditSchema?.trim()) {
      return latestEditSchema;
    }
  }
  return null;
}

export function parseSchemaJson(schemaString: string): Record<string, unknown> | null {
  if (!schemaString?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(schemaString);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function resolveJsonPatchPrevSchemaString(
  card: IJsonPatchMessageItem,
  messages?: ChatMessage[],
): string {
  return card.prevSchema?.trim()
    || findPreviousSchemaStringBeforeCard(messages, card.cardId)
    || '';
}

export function parseJsonPatchOperations(content: string): unknown[] | null {
  if (!content?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function detectJsonPatchApplyFailed(
  card: IJsonPatchMessageItem,
  messages?: ChatMessage[],
): boolean {
  const operations = parseJsonPatchOperations(card.content);
  if (!operations) {
    return false;
  }
  const baseline = parseSchemaJson(resolveJsonPatchPrevSchemaString(card, messages));
  return !baseline || applyJsonPatchOperations(baseline, operations) === null;
}

export function resolveJsonPatchApplyFailed(
  card: IJsonPatchMessageItem,
  messages?: ChatMessage[],
): boolean {
  if (typeof card.applyFailed === 'boolean') {
    return card.applyFailed;
  }
  card.applyFailed = detectJsonPatchApplyFailed(card, messages);
  return card.applyFailed;
}

export function backfillJsonPatchApplyFailedFlags(messages?: ChatMessage[]): boolean {
  if (!messages?.length) {
    return false;
  }

  let updated = false;
  for (const chatMessage of messages) {
    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }
    for (const item of items) {
      if (item.type !== 'json-patch' || typeof item.applyFailed === 'boolean') {
        continue;
      }
      if (!item.generatedTime?.trim() || !item.content?.trim()) {
        continue;
      }
      item.applyFailed = detectJsonPatchApplyFailed(item, messages);
      updated = true;
    }
  }
  return updated;
}

export function setJsonPatchApplyResult(
  result: 'success' | 'failed',
  messages: ChatMessage[] | undefined,
  cardId: string,
): void {
  const card = findSchemaCardByCardId(messages, cardId);
  if (card?.type === 'json-patch') {
    card.applyFailed = result === 'failed';
  }
}

export function rebuildSchemaFromCard(
  card: ISchemaCardLikeMessage,
  options: { messages?: ChatMessage[] } = {},
): Record<string, unknown> | null {
  if (card.type === 'json-patch' && card.applyFailed === true) {
    const prevSchemaStr = resolveJsonPatchPrevSchemaString(card, options.messages);
    return parseSchemaJson(prevSchemaStr);
  }

  const schemaString = resolveSchemaStringFromCard(card);
  if (schemaString) {
    const parsed = parseSchemaJson(schemaString);
    if (parsed) {
      return parsed;
    }
  }

  if (card.type === 'json-patch' && card.content?.trim()) {
    const prevSchemaStr = resolveJsonPatchPrevSchemaString(card, options.messages);
    const baseline = parseSchemaJson(prevSchemaStr);
    const operations = parseJsonPatchOperations(card.content);
    if (baseline && operations) {
      const fromPatch = applyJsonPatchOperations(baseline, operations);
      if (fromPatch && typeof fromPatch === 'object') {
        return fromPatch as Record<string, unknown>;
      }
    }
  }

  return null;
}

export function findPreviousSchemaStringBeforeCard(
  messages: ChatMessage[] | undefined,
  targetCardId: string,
): string | null {
  if (!messages?.length || !targetCardId) {
    return null;
  }

  let previousSchema: string | null = null;

  for (const chatMessage of messages) {
    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    for (const item of items) {
      const isAiCard = item.type === 'schema-card' || item.type === 'json-patch';
      const isManualCard = item.type === 'schema-manual';
      if (!isAiCard && !isManualCard) {
        continue;
      }

      if (isManualCard) {
        const manualCard = item as ISchemaManualMessageItem;
        if (manualCard.cardId === targetCardId) {
          return previousSchema;
        }
        for (const edit of getManualEdits(manualCard)) {
          if (edit.editId === targetCardId) {
            return previousSchema;
          }
          const snapshot = manualEditToCardSnapshot(manualCard, edit);
          const rebuilt = rebuildSchemaFromCard(snapshot, { messages });
          if (rebuilt) {
            previousSchema = JSON.stringify(rebuilt);
          } else if (edit.schema?.trim()) {
            previousSchema = edit.schema;
          }
        }
        continue;
      }

      if (item.cardId === targetCardId) {
        return previousSchema;
      }

      const rebuilt = rebuildSchemaFromCard(item, { messages });
      if (rebuilt) {
        previousSchema = JSON.stringify(rebuilt);
      } else if (item.schema?.trim()) {
        previousSchema = item.schema;
      }
    }
  }

  return null;
}

export function isSchemaVersionHistoryCollectible(
  card: ISchemaCardLikeMessage,
  messages?: ChatMessage[],
): boolean {
  if (!card.cardId?.trim()) {
    return false;
  }
  if (!card.generatedTime?.trim()) {
    return true;
  }
  return rebuildSchemaFromCard(card, { messages }) !== null;
}

function canResolveSchemaFromCard(card: ISchemaCardLikeMessage): boolean {
  if (resolveSchemaStringFromCard(card)) {
    return true;
  }
  return card.type === 'json-patch' && Boolean(card.prevSchema?.trim() && card.content?.trim());
}

export type IStreamingSchemaCardMessage = ISchemaCardMessageItem | IJsonPatchMessageItem;

export function isStreamingSchemaCardItem(
  item: ISchemaCardLikeMessage,
): item is IStreamingSchemaCardMessage {
  return item.type === 'schema-card' || item.type === 'json-patch';
}

export function findSchemaCardByCardId(
  messages: ChatMessage[] | undefined,
  cardId: string,
): IStreamingSchemaCardMessage | null {
  if (!messages?.length || !cardId) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const chatMessage = messages[i];

    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    const card = items.find(
      (item): item is IStreamingSchemaCardMessage =>
        isStreamingSchemaCardItem(item) && item.cardId === cardId,
    );

    if (card) {
      return card;
    }
  }

  return null;
}

export function findLatestPendingSchemaCard(
  messages: ChatMessage[] | undefined,
): IStreamingSchemaCardMessage | null {
  if (!messages?.length) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const chatMessage = messages[i];

    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    const card = [...items]
      .reverse()
      .find(
        (item): item is IStreamingSchemaCardMessage =>
          isStreamingSchemaCardItem(item) && !item.generatedTime?.trim(),
      );

    if (card) {
      return card;
    }
  }

  return null;
}

export function findLatestSchemaCardInConversation(
  messages: ChatMessage[] | undefined,
): ISchemaCardLikeMessage | null {
  if (!messages?.length) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const chatMessage = messages[i];

    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    const cardMessage = [...items]
      .reverse()
      .find(
        (item): item is ISchemaCardLikeMessage =>
          item.type === 'schema-card' || item.type === 'json-patch' || item.type === 'schema-manual',
      );

    if (cardMessage) {
      return cardMessage;
    }
  }

  return null;
}

function applyPendingCardFinalization(
  card: IStreamingSchemaCardMessage,
  options: { schema?: unknown; prevSchema?: string },
  messages?: ChatMessage[],
): void {
  if (card.type === 'json-patch') {
    resolveJsonPatchApplyFailed(card, messages);
  }
  if (card.type !== 'json-patch' || card.applyFailed !== true) {
    const schemaPayload = options.schema ?? rebuildSchemaFromCard(card, { messages });
    if (schemaPayload && !card.schema?.trim()) {
      card.schema = JSON.stringify(schemaPayload);
    }
  }
  if (options.prevSchema !== undefined) {
    card.prevSchema = options.prevSchema;
  }
  card.generatedTime = formatDate(new Date());
}

export function finalizePendingSchemaCard(
  messages: ChatMessage[] | undefined,
  options: {
    cardId?: string;
    schema?: unknown;
    prevSchema?: string;
  } = {},
): boolean {
  const pendingCard =
    (options.cardId ? findSchemaCardByCardId(messages, options.cardId) : null)
    ?? findLatestPendingSchemaCard(messages);

  if (!pendingCard || pendingCard.generatedTime?.trim()) {
    return false;
  }

  applyPendingCardFinalization(pendingCard, options, messages);
  return true;
}

export function repairAllStalePendingSchemaCards(messages: ChatMessage[] | undefined): boolean {
  let updated = false;

  while (true) {
    const pending = findLatestPendingSchemaCard(messages);
    if (!pending) {
      break;
    }
    applyPendingCardFinalization(pending, {}, messages);
    updated = true;
  }

  return updated;
}

export function findLatestSchemaInConversation(
  messages: ChatMessage[] | undefined,
): ILatestSchemaInConversation | null {
  if (!messages?.length) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const chatMessage = messages[i];

    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    const cardMessage = [...items]
      .reverse()
      .find(
        (item): item is ISchemaCardLikeMessage =>
          item.type === 'schema-card' || item.type === 'json-patch' || item.type === 'schema-manual',
      );

    if (cardMessage && canResolveSchemaFromCard(cardMessage)) {
      return {
        schema: resolveSchemaStringFromCard(cardMessage) ?? '',
        cardId: cardMessage.cardId,
        prevSchema: cardMessage.prevSchema ?? '',
        cardMessage,
      };
    }
  }

  return null;
}

export function resolveRenderableSchemaFromMessages(
  messages: ChatMessage[] | undefined,
): { schema: Record<string, unknown>; cardId: string } | null {
  const latest = findLatestSchemaInConversation(messages);
  if (!latest) {
    return null;
  }

  const schema = rebuildSchemaFromCard(latest.cardMessage);
  if (!schema) {
    return null;
  }

  return { schema, cardId: latest.cardId };
}
