import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { ISchemaCardLikeMessage } from './conversation-schema';
import { findSchemaCardByCardId, rebuildSchemaFromCard, isSchemaVersionHistoryCollectible } from './conversation-schema';
import { isContextCompressMessage } from './context-message';
import { findManualCardInMessages, getManualEdits, manualEditToCardSnapshot } from './manual-schema';
import type { ISchemaManualEditRecord, ISchemaManualMessageItem } from '../chat.types';
import { t } from '../../../i18n';
import { formatDate } from '../../../utils/date-format';
import { resolveCardInput, resolveManualEditSaveTitle } from './schema-input-ids';

function getWeekdayLabel(dayIndex: number): string {
  return t(`templateEditor.weekday${dayIndex}`);
}

function formatVersionTimeLabel(generatedTime: string, createdAtMs: number): string {
  const text = generatedTime?.trim();
  if (text) {
    return text;
  }
  if (createdAtMs > 0) {
    return formatDate(createdAtMs);
  }
  return '';
}

export interface ISchemaVersionHistoryEntry {
  cardId: string;
  type: ISchemaCardLikeMessage['type'];
  input: string;
  generatedTime: string;
  createdAtMs: number;

  sequenceIndex: number;
  timeLabel: string;
  description: string;
  authorLabel: string;
  authorType: 'user' | 'ai';
  isLatest: boolean;
  isPending: boolean;
  cardMessage: ISchemaCardLikeMessage;
}

const MS_PER_DAY = 86400000;

const startOfLocalDay = (timeMs: number) => {
  const d = new Date(timeMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const startOfLocalWeek = (timeMs: number) => {
  const dayStart = startOfLocalDay(timeMs);
  const day = new Date(dayStart).getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  return dayStart - daysFromMonday * MS_PER_DAY;
};

export function parseGeneratedTimeMs(generatedTime: string): number {
  const text = generatedTime?.trim();
  if (!text) {
    return 0;
  }
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)
    ? text.replace(' ', 'T')
    : text;
  const parsed = new Date(normalized).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export function formatHistoryPointTimeLabel(createdAtMs: number): string {
  return createdAtMs > 0 ? formatDate(createdAtMs) : '';
}

export function getHistoryTimeGroupLabel(createdAtMs: number, nowMs: number = Date.now()): string {
  const todayStart = startOfLocalDay(nowMs);
  const dayStart = startOfLocalDay(createdAtMs);
  const dayDiff = Math.round((todayStart - dayStart) / MS_PER_DAY);

  if (dayDiff <= 0) {
    return t('templateEditor.timeToday');
  }
  if (dayDiff === 1) {
    return t('templateEditor.timeYesterday');
  }

  const currentWeekStart = startOfLocalWeek(nowMs);
  const createdWeekStart = startOfLocalWeek(createdAtMs);

  if (createdWeekStart === currentWeekStart) {
    return getWeekdayLabel(new Date(createdAtMs).getDay());
  }

  if (createdWeekStart === currentWeekStart - 7 * MS_PER_DAY) {
    return t('templateEditor.timeLastWeek');
  }

  const created = new Date(createdAtMs);
  const now = new Date(nowMs);
  if (created.getFullYear() === now.getFullYear()) {
    return t('templateEditor.historyMonth', { month: created.getMonth() + 1 });
  }

  return t('templateEditor.historyYearMonth', {
    year: created.getFullYear(),
    month: created.getMonth() + 1,
  });
}

function buildDescription(
  card: ISchemaCardLikeMessage,
  options: { isPending: boolean },
): string {
  if (options.isPending) {
    return t('templateEditor.generating');
  }
  if (card.type === 'schema-manual') {
    return resolveManualEditSaveTitle(card);
  }
  if (card.type === 'json-patch') {
    return resolveCardInput(card.input, 'templateEditor.incrementalUpdate');
  }
  return resolveCardInput(card.input, 'templateEditor.aiGeneratedVersion');
}

function filterCollectibleHistoryEntries(
  entries: ISchemaVersionHistoryEntry[],
  messages: ChatMessage[] | undefined,
): ISchemaVersionHistoryEntry[] {
  return entries.filter((entry) =>
    entry.isPending || isSchemaVersionHistoryCollectible(entry.cardMessage, messages),
  );
}

function resolveCardVersionTimeLabel(
  entries: ISchemaVersionHistoryEntry[],
  messages: ChatMessage[] | undefined,
  cardOrEditId: string,
): string | null {
  const historyEntry = entries.find((entry) => entry.cardId === cardOrEditId);
  if (historyEntry && !historyEntry.isPending) {
    return formatHistoryPointTimeLabel(historyEntry.createdAtMs);
  }

  const aiCard = findSchemaCardByCardId(messages, cardOrEditId);
  if (aiCard?.generatedTime?.trim()) {
    return formatHistoryPointTimeLabel(parseGeneratedTimeMs(aiCard.generatedTime));
  }

  const manualCard = findManualCardInMessages(messages, cardOrEditId);
  if (manualCard) {
    const matchedEdit = getManualEdits(manualCard).find((edit) => edit.editId === cardOrEditId);
    const generatedTime = matchedEdit?.generatedTime ?? manualCard.generatedTime;
    if (generatedTime?.trim()) {
      return formatHistoryPointTimeLabel(parseGeneratedTimeMs(generatedTime));
    }
  }

  return null;
}

function inferSourceTimeFromPrevSchema(
  edit: ISchemaManualEditRecord,
  entries: ISchemaVersionHistoryEntry[],
  messages?: ChatMessage[],
): string | null {
  const prevSchema = edit.prevSchema?.trim();
  if (!prevSchema) {
    return null;
  }

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const schema = rebuildSchemaFromCard(entry.cardMessage, { messages });
    if (!schema) {
      continue;
    }
    if (JSON.stringify(schema) === prevSchema) {
      return formatHistoryPointTimeLabel(entry.createdAtMs);
    }
  }

  return null;
}

function buildManualRestoreDescription(
  edit: ISchemaManualEditRecord,
  entries: ISchemaVersionHistoryEntry[],
  messages: ChatMessage[] | undefined,
  options: { isPending: boolean; allowPrevSchemaInfer?: boolean },
): string {
  if (options.isPending) {
    return t('templateEditor.generating');
  }

  let sourceTime: string | null = null;
  if (edit.sourceCardGeneratedTime?.trim()) {
    sourceTime = formatHistoryPointTimeLabel(parseGeneratedTimeMs(edit.sourceCardGeneratedTime));
  } else if (edit.sourceCardId) {
    sourceTime = resolveCardVersionTimeLabel(entries, messages, edit.sourceCardId);
  } else if (options.allowPrevSchemaInfer) {
    sourceTime = inferSourceTimeFromPrevSchema(edit, entries, messages);
  }

  if (sourceTime) {
    return t('templateEditor.appliedFromVersion', { time: sourceTime });
  }

  const hasExplicitSource = Boolean(edit.sourceCardId?.trim() || edit.sourceCardGeneratedTime?.trim());
  if (hasExplicitSource) {
    return t('templateEditor.appliedFromHistory');
  }

  return resolveManualEditSaveTitle(edit);
}

function buildAuthor(card: ISchemaCardLikeMessage): { authorLabel: string; authorType: 'user' | 'ai' } {
  if (card.type === 'schema-manual') {
    return { authorLabel: t('templateEditor.authorUser'), authorType: 'user' };
  }
  return { authorLabel: t('templateEditor.authorAi'), authorType: 'ai' };
}

export function collectSchemaVersionHistory(
  messages: ChatMessage[] | undefined,
  options: { latestCardId?: string } = {},
): ISchemaVersionHistoryEntry[] {
  if (!messages?.length) {
    return [];
  }

  const entries: ISchemaVersionHistoryEntry[] = [];
  let sequenceIndex = 0;

  for (const chatMessage of messages) {
    if (isContextCompressMessage(chatMessage)) {
      continue;
    }

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
        const edits = getManualEdits(manualCard);
        edits.forEach((edit) => {
          const isPending = !edit.generatedTime?.trim();
          const snapshot = manualEditToCardSnapshot(manualCard, edit);
          if (!isPending && !isSchemaVersionHistoryCollectible(snapshot, messages)) {
            return;
          }
          const createdAtMs = parseGeneratedTimeMs(edit.generatedTime);
          const { authorLabel, authorType } = buildAuthor(manualCard);

          entries.push({
            cardId: edit.editId,
            type: manualCard.type,
            input: edit.input ?? '',
            generatedTime: edit.generatedTime ?? '',
            createdAtMs,
            sequenceIndex: sequenceIndex++,
            timeLabel: isPending
              ? t('templateEditor.justNow')
              : formatVersionTimeLabel(edit.generatedTime ?? '', createdAtMs),
            description: '',
            authorLabel,
            authorType,
            isLatest: false,
            isPending,
            cardMessage: snapshot,
          });
        });
        continue;
      }

      const isPending = !item.generatedTime?.trim();
      if (!isPending && !isSchemaVersionHistoryCollectible(item, messages)) {
        continue;
      }
      const createdAtMs = parseGeneratedTimeMs(item.generatedTime);
      const { authorLabel, authorType } = buildAuthor(item);

      entries.push({
        cardId: item.cardId,
        type: item.type,
        input: item.input ?? '',
        generatedTime: item.generatedTime ?? '',
        createdAtMs,
        sequenceIndex: sequenceIndex++,
        timeLabel: isPending
          ? t('templateEditor.justNow')
          : formatVersionTimeLabel(item.generatedTime ?? '', createdAtMs),
        description: '',
        authorLabel,
        authorType,
        isLatest: false,
        isPending,
        cardMessage: item,
      });
    }
  }

  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const latestCardId = options.latestCardId ?? latestEntry?.cardId ?? '';
  const latestSequenceIndex = latestEntry?.sequenceIndex ?? -1;

  return entries.map((entry) => {
    let isLatest = entry.sequenceIndex === latestSequenceIndex;
    if (!isLatest && entry.type === 'schema-manual') {
      const manualCard = entry.cardMessage as ISchemaManualMessageItem;
      if (manualCard.cardId === latestCardId) {
        const edits = getManualEdits(manualCard);
        isLatest = edits[edits.length - 1]?.editId === entry.cardId;
      }
    }
    return {
      ...entry,
      isLatest,
      description: buildDescription(entry.cardMessage, { isPending: entry.isPending }),
    };
  });
}

export function groupSchemaVersionHistory(
  entries: ISchemaVersionHistoryEntry[],
  nowMs: number = Date.now(),
): Array<{ label: string; items: ISchemaVersionHistoryEntry[] }> {
  const sorted = [...entries].sort((a, b) => b.sequenceIndex - a.sequenceIndex);
  const groupOrder: string[] = [];
  const buckets = new Map<string, ISchemaVersionHistoryEntry[]>();

  for (const entry of sorted) {
    const label = entry.isPending
      ? t('templateEditor.timeToday')
      : getHistoryTimeGroupLabel(entry.createdAtMs, nowMs);
    if (!buckets.has(label)) {
      buckets.set(label, []);
      groupOrder.push(label);
    }
    buckets.get(label)!.push(entry);
  }

  return groupOrder.map((label) => ({
    label,
    items: buckets.get(label) ?? [],
  }));
}

export function resolveSchemaCardScopeId(
  messages: ChatMessage[] | undefined,
  cardOrEditId: string | undefined,
): string {
  if (!messages?.length || !cardOrEditId) {
    return '';
  }

  const manualCard = findManualCardInMessages(messages, cardOrEditId);
  if (manualCard) {
    return manualCard.cardId;
  }

  const aiCard = findSchemaCardByCardId(messages, cardOrEditId);
  if (aiCard) {
    return aiCard.cardId;
  }

  return cardOrEditId;
}

export function filterSchemaVersionHistoryForCard(
  entries: ISchemaVersionHistoryEntry[],
  messages: ChatMessage[] | undefined,
  scopeCardId: string,
  currentCardOrEditId?: string,
): ISchemaVersionHistoryEntry[] {
  const lookupId = currentCardOrEditId || scopeCardId;
  if (!lookupId || !entries.length) {
    return [];
  }

  const manualCard = findManualCardInMessages(messages, lookupId);
  if (manualCard) {
    const edits = getManualEdits(manualCard);
    const editIds = new Set(edits.map((edit) => edit.editId));
    const scoped = entries.filter((entry) => editIds.has(entry.cardId));
    if (!scoped.length) {
      return [];
    }

    const collectible = filterCollectibleHistoryEntries(scoped, messages);
    if (!collectible.length) {
      return [];
    }

    const latestInScopeId = collectible.at(-1)?.cardId;
    const firstEditId = edits[0]?.editId;

    return collectible.map((entry) => {
      const isLatestInScope = entry.cardId === latestInScopeId;
      const matchedEdit = edits.find((edit) => edit.editId === entry.cardId);
      const isFirstEdit = entry.cardId === firstEditId;
      const hasSourceInfo = Boolean(
        matchedEdit?.sourceCardId?.trim() || matchedEdit?.sourceCardGeneratedTime?.trim(),
      );
      const description = (isFirstEdit || hasSourceInfo) && matchedEdit
        ? buildManualRestoreDescription(matchedEdit, entries, messages, {
          isPending: entry.isPending,
          allowPrevSchemaInfer: isFirstEdit,
        })
        : buildDescription(entry.cardMessage, {
          isPending: entry.isPending,
        });

      return {
        ...entry,
        isLatest: isLatestInScope,
        description,
      };
    });
  }

  const scoped = entries.filter((entry) => entry.cardId === lookupId);
  if (!scoped.length) {
    return [];
  }

  return filterCollectibleHistoryEntries(scoped, messages);
}
