import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import { templateChat } from '../template-chat-api';
import type { LLMConfig } from '../chat.types';
import { isContextCompressMessage } from './context-message';

const COMPRESS_PROMPT_PREFIX =
  '请将以下对话历史压缩为一段简洁的中文摘要，保留用户意图、关键结论与界面/schema 相关变更。只输出摘要正文，不要使用代码块标记。\n\n';

export function serializeMessagesForCompress(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      if (isContextCompressMessage(m)) {
        const text = typeof m.content === 'string' ? m.content : '';
        return `会话摘要: ${text}`;
      }
      const roleLabel = m.role === 'user' ? '用户' : '助手';
      let text = '';
      if (typeof m.content === 'string') {
        text = m.content;
      } else if (
        Array.isArray((m as unknown as { messages?: { content?: string; input?: string }[] }).messages)
      ) {
        text = ((m as unknown as { messages?: { content?: string; input?: string }[] }).messages || [])
          .map((item) => item.content ?? item.input ?? '')
          .filter(Boolean)
          .join('\n');
      }
      return `${roleLabel}: ${text}`;
    })
    .join('\n\n');
}

export async function compressConversationHistory(options: {
  url: string;
  messages: ChatMessage[];
  templateSchema: unknown;
  llmConfig: LLMConfig;
  signal?: AbortSignal;
}): Promise<string> {
  const { url, messages, templateSchema, llmConfig, signal } = options;
  const historyText = serializeMessagesForCompress(messages);
  if (!historyText.trim()) {
    throw new Error('没有可压缩的会话内容');
  }

  const response = await templateChat({
    url,
    messages: [{ role: 'user', content: COMPRESS_PROMPT_PREFIX + historyText }],
    signal: signal ?? new AbortController().signal,
    templateSchema,
    llmConfig,
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let summary = '';
  let terminalState: 'done' | 'error' | 'aborted' | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    while (true) {
      const lineEnd = buffer.indexOf('\n');
      if (lineEnd === -1) break;
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(line.indexOf(':') + 1).trim();
      if (data === '[DONE]') {
        terminalState = 'done';
        break;
      }
      if (data === '[ERROR]') {
        terminalState = 'error';
        break;
      }
      if (data === '[ABORTED]') {
        terminalState = 'aborted';
        break;
      }
      try {
        const chunk = JSON.parse(data);
        const content = chunk.choices?.[0]?.delta?.content;
        if (typeof content === 'string') {
          summary += content;
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
    if (terminalState) {
      break;
    }
  }

  if (terminalState === 'error') {
    throw new Error('压缩请求失败');
  }
  if (terminalState === 'aborted') {
    throw new Error('压缩请求已中止');
  }

  const trimmed = summary.trim();
  if (!trimmed) {
    throw new Error('压缩结果为空');
  }
  return trimmed;
}
