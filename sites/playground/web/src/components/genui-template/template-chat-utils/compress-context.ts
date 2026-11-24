import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import { templateChat } from '../template-chat-api';
import type { LLMConfig } from '../chat.types';
import { locale } from '../../../i18n';

function throwAborted(): never {
  const error = new Error('压缩请求已中止');
  error.name = 'AbortError';
  throw error;
}

export async function compressConversationHistory(options: {
  url: string;
  messages: ChatMessage[];
  templateSchema: unknown;
  llmConfig: LLMConfig;
  signal?: AbortSignal;
}): Promise<string> {
  const { url, messages, templateSchema, llmConfig, signal } = options;

  // 压缩走独立接口：由基础地址派生 /compress 子路径
  const compressUrl = `${url.replace(/\/+$/, '')}/compress`;

  // 只上送模型实际可读的顶层 content；type 用于服务端识别压缩摘要消息
  const payloadMessages = messages.map((message) => ({
    role: message.role,
    content: typeof message.content === 'string' ? message.content : '',
    type: (message as { type?: string }).type,
  }));

  const response = await templateChat({
    url: compressUrl,
    messages: payloadMessages,
    signal: signal ?? new AbortController().signal,
    templateSchema,
    llmConfig,
    lang: locale.value,
  });

  if (!response.body) {
    throw new Error('压缩响应为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let summary = '';
  let terminalState: 'done' | 'error' | 'aborted' | null = null;

  try {
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
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  if (signal?.aborted || terminalState === 'aborted') {
    throwAborted();
  }
  if (terminalState === 'error') {
    throw new Error('压缩请求失败');
  }
  if (terminalState !== 'done') {
    throw new Error('压缩流异常结束');
  }

  const trimmed = summary.trim();
  if (!trimmed) {
    throw new Error('压缩结果为空');
  }
  return trimmed;
}
