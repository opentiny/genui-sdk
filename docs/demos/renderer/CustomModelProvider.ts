import {
  BaseModelProvider,
  type ChatCompletionRequest,
  type ChatCompletionStreamResponse,
} from '@opentiny/tiny-robot-kit';
import { reactive } from 'vue';
import type { IChatMessage } from '@opentiny/genui-sdk-core';
import { v4 as uuidv4 } from 'uuid';

function useSchemaStream() {
  let inSchemaStream = false;
  let bufferText = '';

  const schemaFlag = '```schemaJson';
  const endFlag = '```';

  const clearSchemaState = () => {
    inSchemaStream = false;
    bufferText = '';
  };

  const isSchemaJsonStart = (str: string): boolean => {
    const index = str.indexOf('`');
    if (index === -1) {
      return false;
    }
    return schemaFlag.startsWith(str.substring(index, index + schemaFlag.length));
  };

  const isSchemaJsonEnd = (str: string): boolean => {
    const index = str.lastIndexOf('\n');
    if (index === -1) {
      return false;
    }
    const newStr = str.slice(index).trim().substring(0, endFlag.length);
    return endFlag.startsWith(newStr);
  };

  const handleSchemaStream = (content: string, chatMessage: IChatMessage): boolean => {
    if (!content || typeof content !== 'string') {
      return false;
    }

    const deltaPart = bufferText + content;

    // 是否包含 schema 开始或者结束特征
    if ((!inSchemaStream && isSchemaJsonStart(deltaPart)) || (inSchemaStream && isSchemaJsonEnd(deltaPart))) {
      // 标志不完整
      const matchFlag = inSchemaStream ? /(\n\s*)```/ : schemaFlag;
      const matchPart = deltaPart.match(matchFlag)?.[0];
      if (!matchPart) {
        bufferText = deltaPart;
        return true;
      }

      chatMessage.content += deltaPart;

      // 在流式返回中且匹配到结束标志
      if (inSchemaStream) {
        const trimmedDelta = deltaPart.trim();
        const [schemaPart, markdownPart] = trimmedDelta.split(matchPart);

        // 更新最后一个 schema-card 的内容
        const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
        if (lastMessage?.type === 'schema-card') {
          lastMessage.content += schemaPart;
        }

        // 如果有后续的 markdown 内容，添加新的 markdown 消息
        if (markdownPart) {
          chatMessage.messages.push({
            type: 'markdown',
            content: markdownPart,
          });
        }
      }
      // 匹配到开始标志
      else {
        const trimmedDelta = deltaPart.trim();
        const [markdownPart, schemaPart] = trimmedDelta.split(matchPart);

        // 如果有前置的 markdown 内容，更新或添加 markdown 消息
        if (markdownPart) {
          const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
          if (lastMessage && lastMessage.type === 'markdown') {
            lastMessage.content += markdownPart;
          } else {
            chatMessage.messages.push({
              type: 'markdown',
              content: markdownPart,
            });
          }
        }

        // 添加新的 schema-card 消息
        chatMessage.messages.push({
          type: 'schema-card',
          content: schemaPart,
        });
      }

      inSchemaStream = !inSchemaStream;
      bufferText = '';
      return true;
    }

    bufferText = '';

    // 流式返回 schema 中
    if (inSchemaStream) {
      chatMessage.content += deltaPart;
      const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
      if (lastMessage && lastMessage.type === 'schema-card') {
        lastMessage.content += deltaPart;
      }
      return true;
    }

    // 普通 markdown 内容
    chatMessage.content += deltaPart;
    const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
    if (lastMessage?.type === 'markdown') {
      lastMessage.content += deltaPart;
    } else {
      chatMessage.messages.push({ type: 'markdown', content: deltaPart });
    }

    return false;
  };

  return {
    handleSchemaStream,
    clearSchemaState,
  };
}

/**
 * 自定义模型提供者
 * 用于处理流式返回，支持 schema-card 和 markdown 两种消息类型
 */
export class CustomModelProvider extends BaseModelProvider {
  constructor(private url: string) {
    super({ provider: 'custom' });
  }

  async chatStream(
    request: ChatCompletionRequest,
    handler: {
      onData: (data: ChatCompletionStreamResponse) => void;
      onDone: () => void;
      onError: (error: any) => void;
    },
  ) {
    const { onDone, onData, onError } = handler;
    let response: Response;

    try {
      response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: request.messages,
          stream: true,
        }),
        signal: request.options?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      onDone({ type: 'error', error } as any);
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    const { handleSchemaStream, clearSchemaState } = useSchemaStream();

    const chatMessage = reactive<IChatMessage>({
      role: 'assistant',
      content: '',
      messages: [],
    });
    onData(chatMessage as any);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 追加新块到缓冲区
      buffer += decoder.decode(value, { stream: true });

      // 处理缓冲区中的完整行
      while (true) {
        const lineEnd = buffer.indexOf('\n');
        if (lineEnd === -1) break;

        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onDone();
            return;
          }

          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta;
            const content = delta?.content;

            if (content) {
              // 使用 handleSchemaStream 处理 schema 和 markdown 内容
              handleSchemaStream(content, chatMessage);

              // 如果是新创建的 schema-card，需要生成 id
              const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
              if (lastMessage && lastMessage.type === 'schema-card' && !lastMessage.id) {
                lastMessage.id = uuidv4();
              }

              onData(chatMessage as any);
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }

    onDone();
  }
}
