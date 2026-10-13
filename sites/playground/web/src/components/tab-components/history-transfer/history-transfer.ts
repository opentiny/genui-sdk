import type { Conversation } from '@opentiny/tiny-robot-kit';
import { t } from '../../../i18n';
import { formatDate, generateId } from '../../../utils';

const generateUniqueId = (existingIds: Set<string>) => {
  let nextId = generateId();

  while (existingIds.has(nextId)) {
    nextId = generateId();
  }

  return nextId;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeConversation = (value: unknown): Conversation | null => {
  if (!isRecord(value) || !Array.isArray(value.messages)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  if (!id) {
    return null;
  }

  return {
    id,
    title: typeof value.title === 'string' && value.title.trim() ? value.title : t('conversation.newConversation'),
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
    messages: value.messages as Conversation['messages'],
    metadata: isRecord(value.metadata) ? value.metadata : {},
  };
};

export const downloadConversations = (conversations: Conversation[], downloadBasenamePrefix = 'genui-history') => {
  const blob = new Blob([JSON.stringify(conversations, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${downloadBasenamePrefix}-${formatDate(new Date(), 'YYYY-MM-DD-HH-mm-ss')}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const parseConversationFile = async (file: File) => {
  let rawData: unknown;
  try {
    rawData = JSON.parse(await file.text());
  } catch (error) {
    throw new Error(t('history.invalidJson'));
  }

  if (!Array.isArray(rawData)) {
    throw new Error(t('history.mustBeArray'));
  }

  return rawData.map(normalizeConversation).filter(Boolean) as Conversation[];
};

export const reconcileImportedConversationIds = (
  existingConversations: Conversation[],
  importedConversations: Conversation[],
) => {
  const existingIds = new Set(existingConversations.map((conversation) => conversation.id));

  return importedConversations.map((conversation) => {
    if (!existingIds.has(conversation.id)) {
      existingIds.add(conversation.id);
      return conversation;
    }

    const nextConversation = { ...conversation, id: generateUniqueId(existingIds) };
    existingIds.add(nextConversation.id);
    return nextConversation;
  });
};
