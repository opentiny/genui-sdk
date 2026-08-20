import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import { templateChat } from '../template-chat-api';
import type { LLMConfig } from '../chat.types';
import { isContextCompressMessage } from './context-message';

const COMPRESS_PROMPT_PREFIX = `请将以下对话历史压缩为可供后续模型继续工作的中文摘要。
必须保留：
1. 用户当前目标、明确需求和约束；
2. 已确认的设计或实现决策，以及被否决的方案；
3. 已完成的重要界面/Schema 变更及其原因；
4. 尚未解决的问题和下一步工作；
5. 后续对话中会用到的名称、ID 或关键值。

当前 Schema 会由系统单独提供，不要复制完整 Schema，也不要虚构对话中没有的信息。
使用“目标 / 已确认 / 已完成 / 待处理 / 关键上下文”几个简短小节；没有内容的小节可以省略。
只输出摘要正文，不要使用代码块标记。

`;

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
