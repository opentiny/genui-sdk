import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IMessageItem } from '../chat.types';
import { normalizeManualEditInputs } from './schema-input-ids';
import { t } from '../../../i18n';

/** 压缩摘要消息类型（不展示在气泡列表，仅用于持久化与裁剪上下文） */
export const CONTEXT_COMPRESS_MESSAGE_TYPE = 'context-compress' as const;

export type ContextCompressMessageType = typeof CONTEXT_COMPRESS_MESSAGE_TYPE;

export type IContextCompressMessage = ChatMessage & {
  type: ContextCompressMessageType;
  content: string;
};

const CONTEXT_SUMMARY_PREFIX = '以下是此前对话的压缩摘要，请在此基础上继续：\n\n';

export function isContextCompressMessage(message: ChatMessage): boolean {
  return (message as { type?: string }).type === CONTEXT_COMPRESS_MESSAGE_TYPE;
}

/**
 * 用户在 SchemaJSON 编辑器中手动保存的版本消息（非对话输入）
 * @param message 会话消息
 * @returns 是否为手动保存的版本消息
 */
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

/** 页面展示、索引计算：排除压缩摘要 */
export function getVisibleChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => !isContextCompressMessage(m));
}

export function findLatestContextCompressIndex(messages: ChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (isContextCompressMessage(messages[i])) return i;
  }
  return -1;
}

export interface ContextCompressionPlan {
  /** 需要交给模型生成新摘要的活动上下文 */
  messages: ChatMessage[];
  /** 新摘要在完整历史中的插入位置；原始消息不会被删除 */
  insertIndex: number;
}

/**
 * 构造滚动压缩计划：压缩全部活动上下文，不保留原文。
 */
export function getContextCompressionPlan(
  messages: ChatMessage[],
): ContextCompressionPlan | null {
  const latestCompressIndex = findLatestContextCompressIndex(messages);
  const activeStart = latestCompressIndex === -1 ? 0 : latestCompressIndex;
  const messagesToCompress = messages
    .slice(activeStart)
    .filter((message, index) => !isContextCompressMessage(message) || index === 0);

  if (!messagesToCompress.some((message) => !isContextCompressMessage(message))) {
    return null;
  }

  return { messages: messagesToCompress, insertIndex: messages.length };
}

/** 自最近一次压缩摘要起（含摘要）；无压缩时返回全部可见消息 */
function getMessagesSinceLatestCompress(messages: ChatMessage[]): ChatMessage[] {
  const compressIndex = findLatestContextCompressIndex(messages);
  if (compressIndex === -1) {
    return getVisibleChatMessages(messages);
  }
  const tail = messages.slice(compressIndex + 1).filter((m) => !isContextCompressMessage(m));
  return [messages[compressIndex], ...tail];
}

function toBackendChatMessage(message: ChatMessage): ChatMessage | null {
  if (isContextCompressMessage(message)) {
    const summary = typeof message.content === 'string' ? message.content : '';
    return { role: 'user', content: `${CONTEXT_SUMMARY_PREFIX}${summary}` };
  }
  const { type, ...rest } = message as ChatMessage & { type?: string };
  if (isManualSchemaSaveMessage(message)) {
    return {
      ...rest,
      content: t('templateEditor.manualEditBackendContent'),
    } as ChatMessage;
  }
  return rest as ChatMessage;
}

/** 发给后端的对话消息：最新压缩摘要 + 之后正常对话，摘要转为普通 user 消息 */
export function getBackendChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return getMessagesSinceLatestCompress(messages)
    .map(toBackendChatMessage)
    .filter((message): message is ChatMessage => message !== null);
}

/** 最后一条非压缩消息（流式 loading 等场景用） */
export function getLastNonCompressMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (!isContextCompressMessage(messages[i])) return messages[i];
  }
}

export function createContextCompressMessage(content: string, messageId: string): IContextCompressMessage {
  return {
    role: 'assistant',
    type: CONTEXT_COMPRESS_MESSAGE_TYPE,
    content,
    messageId,
  };
}

export function getLastUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && !isManualSchemaSaveMessage(messages[i])) {
      return messages[i];
    }
  }
  return undefined;
}
