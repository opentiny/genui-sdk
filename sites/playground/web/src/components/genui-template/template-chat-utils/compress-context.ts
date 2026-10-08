import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import { templateChat } from '../template-chat-api';
import type { LLMConfig } from '../chat.types';
import { isContextCompressMessage } from './context-message';

const COMPRESS_PROMPT_PREFIX = (summaryText: string, turnsText: string) => `【任务】
将「当前摘要」与「新增对话」合并，更新为一版新的会话摘要，作为后续页面生成模型继续工作的唯一上下文。

「当前摘要」是上一次压缩的产物：仅保留其中仍有效的信息，较新的纠正/反馈替换旧内容，已失效的事项直接删除；不要逐字抄录。
「新增对话」是上次压缩之后发生的新内容：把其中影响后续工作的关键信息并入摘要。

摘要长度：信息保真优先，先保留用户目标、已确认决策、精确的组件 ID/字段名等关键值，再舍弃寒暄和可从上下文恢复的信息；总长度以约 500 字为软上限，信息量大时可适当放宽；不要输出字数。

请按照以下 8 个结构化小节组织摘要（没有内容的小节直接省略，不要输出空标题）：
1. 背景上下文 (Background Context)：项目类型、技术栈和用户的总体目标；
2. 关键决策 (Key Decisions)：重要的技术选择和原因、架构与设计考虑、问题解决方案的选择；
3. 工具使用记录 (Tool Usage Log)：主要工具/文件操作、Schema 变更等关键操作，保留完整准确的信息；
4. 用户意图演进 (User Intent Evolution)：需求的变化过程、优先级调整、新增功能需求；
5. 执行结果汇总 (Execution Results)：成功完成的任务、生成的界面/Schema 变更及其原因、验证结果；
6. 错误与解决 (Errors and Solutions)：遇到的问题类型、错误处理方法、回退与换方案的经验教训；
7. 未解决问题 (Open Issues)：当前待解决的问题、已知的限制和约束、需要后续处理的事项；
8. 后续计划 (Future Plans)：下一步行动计划、后续对话中会用到的名称、ID 或关键值。

注意事项：
- 只记录与当前任务相关的不确定项；助手的猜测不得升级成用户要求；
- 没有证据不得标记“已完成”；
- 不得编造历史中不存在的信息。

【当前摘要】
${summaryText || '（无）'}

【新增对话】
${turnsText}
`;

const SCHEMA_HISTORY_ITEM_TYPES = new Set(['json-patch', 'schema-manual']);
const SKIP_HISTORY_ITEM_TYPES = new Set(['loading-text']);

type HistoryItem = { type?: string; content?: string; input?: string };

function serializeHistoryItem(item: HistoryItem): string {
  if (item.type && SKIP_HISTORY_ITEM_TYPES.has(item.type)) {
    return '';
  }
  // Schema-card: 完整 JSON 快照。当前 templateSchema 已包含其状态，
  // 用户意图已由 user 消息原文序列化，压缩层无需重复接收。
  if (item.type?.startsWith('schema-card')) {
    return '';
  }
  if (item.type && SCHEMA_HISTORY_ITEM_TYPES.has(item.type)) {
    return item.input ? `[Schema 变更] ${item.input}` : '[Schema 变更]';
  }
  return item.content ?? item.input ?? '';
}

function serializeStructuredMessages(items: HistoryItem[] | undefined): string {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }
  return items.map(serializeHistoryItem).filter(Boolean).join('\n');
}

export function serializeMessagesForCompress(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      const roleLabel = m.role === 'user' ? '用户' : '助手';
      const structured = serializeStructuredMessages((m as unknown as { messages?: HistoryItem[] }).messages);
      const text = structured || (typeof m.content === 'string' ? m.content : '');
      return `${roleLabel}: ${text}`;
    })
    .join('\n\n');
}

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
  const summaryMessage = messages.find(isContextCompressMessage);
  const summaryText =
    summaryMessage && typeof summaryMessage.content === 'string' ? summaryMessage.content : '';
  const turnsText = serializeMessagesForCompress(messages.filter((m) => !isContextCompressMessage(m)));
  if (!turnsText.trim()) {
    throw new Error('没有可压缩的会话内容');
  }

  const response = await templateChat({
    url,
    messages: [{ role: 'user', content: COMPRESS_PROMPT_PREFIX(summaryText, turnsText) }],
    signal: signal ?? new AbortController().signal,
    templateSchema,
    llmConfig,
    mode: 'compress',
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
