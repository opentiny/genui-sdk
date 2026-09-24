import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IMessageItem } from '../chat.types';
import type { ComposerSegment } from '../schema-composer';
import type { SelectedSchemaNode } from '../schema-node-selection';
import { normalizeManualEditInputs } from './schema-input-ids';
import { t } from '../../../i18n';

export function isManualSchemaSaveMessage(message: ChatMessage): boolean {
  const items = (message as { messages?: IMessageItem[] }).messages;
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }
  return items.every((item) => item.type === 'schema-manual');
}

export function normalizeManualSchemaSaveMessages(messages: ChatMessage[] | undefined): boolean {
  if (!messages?.length) {
    return false;
  }

  let changed = false;
  for (const message of messages) {
    if (isManualSchemaSaveMessage(message) && message.role === 'user') {
      message.role = 'assistant';
      changed = true;
    }
  }

  if (normalizeManualEditInputs(messages)) {
    changed = true;
  }

  return changed;
}

/**
 * 旧格式 tag 段（{type:'tag', tag}）迁移为 node 段（{type:'node', value}），
 * 兼容 ComposerSegment 类型升级前持久化的历史会话；返回是否发生变更。
 */
export function normalizeTemplateUserSegments(messages: ChatMessage[] | undefined): boolean {
  if (!messages?.length) {
    return false;
  }

  let changed = false;
  for (const message of messages) {
    const items = (message as { messages?: IMessageItem[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }
    for (const item of items) {
      if (item.type !== 'template-user' || !Array.isArray(item.segments)) {
        continue;
      }
      item.segments = item.segments.map((seg) => {
        if ((seg as { type?: string }).type === 'tag') {
          changed = true;
          const { tag } = seg as unknown as { type: 'tag'; tag: SelectedSchemaNode };
          return { type: 'node', value: tag };
        }
        return seg;
      });
    }
  }

  return changed;
}

function toBackendChatMessage(message: ChatMessage): ChatMessage | null {
  const { type, ...rest } = message as ChatMessage & { type?: string };
  if (isManualSchemaSaveMessage(message)) {
    return {
      ...rest,
      content: t('templateEditor.manualEditBackendContent'),
    } as ChatMessage;
  }
  return rest as ChatMessage;
}

export function getBackendChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .map(toBackendChatMessage)
    .filter((message): message is ChatMessage => message !== null);
}

export function getLastUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && !isManualSchemaSaveMessage(messages[i])) {
      return messages[i];
    }
  }
  return undefined;
}
