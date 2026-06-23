import { extractTitleFromSchema, parsePreviewSchema, type IBuilderCardMessageItem } from './builder-schema-utils';
import type { IConversationMessage } from './builder-conversation-bridge';

export interface IBuilderHistoryRecord {
  id: string;
  timeLabel: string;
  documentName: string;
  card: IBuilderCardMessageItem;
}

export interface IBuilderHistoryDateGroup {
  dateKey: string;
  dateLabel: string;
  records: IBuilderHistoryRecord[];
}

function formatDateLabel(createdTime: string) {
  const match = createdTime.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return createdTime;
  }
  return `${match[1]}/${match[2]}/${match[3]}`;
}

function formatRecordTitle(createdTime: string) {
  const match = createdTime.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) {
    return createdTime;
  }
  const [, year, month, day, hour, minute] = match;
  return `${year}/${month}/${day} ${hour}:${minute}`;
}

function parseCreatedTimestamp(createdTime: string) {
  const match = createdTime.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return 0;
  }
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ).getTime();
}

function parseDateKeyTimestamp(dateKey: string) {
  const match = dateKey.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!match) {
    return 0;
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
}

export function isGeneratedBuilderSchema(card: IBuilderCardMessageItem) {
  if (card?.type !== 'builder-card' || !card.createdTime?.trim()) {
    return false;
  }

  return Boolean(parsePreviewSchema(card.schema));
}

export function collectBuilderCardsFromMessages(messages: readonly IConversationMessage[]) {
  const cards: IBuilderCardMessageItem[] = [];

  for (const message of messages) {
    if (message.role !== 'assistant' || !Array.isArray(message.messages)) {
      continue;
    }

    for (const item of message.messages) {
      const card = item as IBuilderCardMessageItem;
      if (isGeneratedBuilderSchema(card)) {
        cards.push(card);
      }
    }
  }

  return cards;
}

export function findBuilderCardById(messages: readonly IConversationMessage[], cardId: string) {
  if (!cardId) {
    return null;
  }

  for (const message of messages) {
    if (message.role !== 'assistant' || !Array.isArray(message.messages)) {
      continue;
    }

    for (const item of message.messages) {
      const card = item as IBuilderCardMessageItem;
      if (card?.type === 'builder-card' && card.id === cardId) {
        return card;
      }
    }
  }

  return null;
}

export function findLatestBuilderCardRef(messages: readonly IConversationMessage[]) {
  let latestCard: IBuilderCardMessageItem | null = null;
  let latestTs = 0;

  for (const message of messages) {
    if (message.role !== 'assistant' || !Array.isArray(message.messages)) {
      continue;
    }

    for (const item of message.messages) {
      const card = item as IBuilderCardMessageItem;
      if (card?.type !== 'builder-card' || !card.createdTime?.trim()) {
        continue;
      }

      const ts = parseCreatedTimestamp(card.createdTime);
      if (ts >= latestTs) {
        latestTs = ts;
        latestCard = card;
      }
    }
  }

  return latestCard;
}

export function getLatestBuilderCard(messages: readonly IConversationMessage[]) {
  const latestCard = findLatestBuilderCardRef(messages);
  if (!latestCard || !isGeneratedBuilderSchema(latestCard)) {
    return null;
  }

  return latestCard;
}

export function groupBuilderHistoryFromCards(cards: readonly IBuilderCardMessageItem[]) {
  const groupMap = new Map<string, IBuilderHistoryRecord[]>();

  for (const card of cards) {
    const dateKey = formatDateLabel(card.createdTime);
    const record: IBuilderHistoryRecord = {
      id: card.id,
      timeLabel: formatRecordTitle(card.createdTime),
      documentName: extractTitleFromSchema(card.schema, card.input || '') || '未命名文档',
      card,
    };

    const records = groupMap.get(dateKey);
    if (records) {
      records.push(record);
    } else {
      groupMap.set(dateKey, [record]);
    }
  }

  return Array.from(groupMap.entries())
    .map(([dateKey, records]) => ({
      dateKey,
      dateLabel: dateKey,
      records: records.sort(
        (a, b) => parseCreatedTimestamp(b.card.createdTime) - parseCreatedTimestamp(a.card.createdTime),
      ),
    }))
    .sort((a, b) => parseDateKeyTimestamp(b.dateKey) - parseDateKeyTimestamp(a.dateKey));
}

export function groupBuilderHistoryByDate(messages: readonly IConversationMessage[]) {
  return groupBuilderHistoryFromCards(collectBuilderCardsFromMessages(messages));
}

export function snapshotConversationBuilderCards(messages: readonly IConversationMessage[]) {
  return collectBuilderCardsFromMessages(messages).map((card) => ({
    type: 'builder-card' as const,
    id: card.id,
    title: card.title,
    input: card.input,
    schema: card.schema,
    createdTime: card.createdTime,
  }));
}
