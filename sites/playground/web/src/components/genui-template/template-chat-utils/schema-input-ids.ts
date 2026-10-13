import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { ISchemaManualEditRecord, ISchemaManualMessageItem } from '../chat.types';
import { t } from '../../../i18n';

type ManualEditInput = Pick<ISchemaManualEditRecord, 'input' | 'inputType'>;

export function resolveManualEditSaveTitle(
  record: ManualEditInput,
  fallbackKey = 'templateEditor.manualEditSave',
): string {
  if (record.inputType === 'user') {
    return record.input?.trim() || t(fallbackKey);
  }
  return t(fallbackKey);
}

export function resolveCardInput(input: string | undefined, fallbackKey: string): string {
  const trimmed = input?.trim();
  if (!trimmed) {
    return t(fallbackKey);
  }
  return trimmed;
}

export function normalizeManualEditInputs(messages: ChatMessage[] | undefined): boolean {
  if (!messages?.length) {
    return false;
  }

  let changed = false;

  const normalizeRecord = (record: ManualEditInput) => {
    if (record.inputType === 'user') {
      return;
    }
    if (record.inputType !== 'manual_edit_save') {
      record.inputType = 'manual_edit_save';
      changed = true;
    }
    if (record.input) {
      record.input = '';
      changed = true;
    }
  };

  for (const message of messages) {
    const items = (message as { messages?: ISchemaManualMessageItem[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    for (const item of items) {
      if (item.type !== 'schema-manual') {
        continue;
      }

      normalizeRecord(item);

      for (const edit of item.edits ?? []) {
        normalizeRecord(edit);
      }
    }
  }

  return changed;
}
