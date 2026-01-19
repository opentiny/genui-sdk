import { reactive, toRaw } from 'vue';
import { BaseModelProvider, type ChatCompletionRequest, type ChatCompletionResponse } from '@opentiny/tiny-robot-kit';
import { chat } from './chat-api';
import type { LLMConfig, IStreamDelta, IChatMessage, IMessageItem } from './chat.types';
import { emitter } from './event-emitter';
import useSchemaStream from './useSchemaStream';

export interface ICustomModelProviderOptions {
  url: string;
  llmConfig: LLMConfig;
}

export interface IOpenaiCompatibleChunk {
  id: string;
  object: string;
  model: string;
  created: number;
  choices: { index: number; delta: { content: string } }[];
}

export interface INotificationEvent {
  type: 'markdown' | 'schema-card' | 'tool' | 'done';
  content: string | Record<string, any>;
  name?: string;
  status?: string;
  [key: string]: any;
}
export class CustomModelProvider extends BaseModelProvider {
  private url: string;
  private llmConfig: LLMConfig;
  private templateSchema: any;
  constructor({ url, llmConfig }: ICustomModelProviderOptions) {
    super({ provider: 'custom' });
    this.url = url;
    this.llmConfig = llmConfig;
  }
  validateRequest(_: ChatCompletionRequest) {}

  changeLlmConfig(llmConfig: LLMConfig) {
    this.llmConfig = llmConfig;
  }

  async getData(request: ChatCompletionRequest) {
    return await chat(this.url, request.messages, this.llmConfig, request.options?.signal, this.templateSchema);
  }

  async chat(_: ChatCompletionRequest) {
    return {} as ChatCompletionResponse;
  }

  async chatStream(request: any, handler: { onData: any; onDone: any; onError: any }) {
    const { onDone, onData } = handler;
    // 8位随机 ID
    const requestId = crypto.randomUUID();
    const response = await this.getData(request);
    let reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let summaryText = '';
    let chatMessage: IChatMessage = reactive({
      role: 'assistant',
      content: '',
      messages: [] as IMessageItem[],
    });
    const {content: input, messageId} = request.messages[request.messages.length - 1];
    const { handleSchemaStream } = useSchemaStream();
    onData(chatMessage);

    /**
     * 发送通知事件
     */
    const emitNotification = (delta: IStreamDelta) => {
      const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
      if (lastMessage) {
        emitter.emit('notification', {
          type: lastMessage.type,
          cardId: messageId,
          input,
          delta,
          chatMessage: structuredClone(toRaw(chatMessage)),
        });
      }
    };

    /**
     * 处理 schema 和 markdown 流式内容
     */
    const onSchemaCard = (content: string, delta: IStreamDelta) => {
      handleSchemaStream(content, chatMessage, input, messageId);

      // 发送通知
      emitNotification(delta);
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // Append new chunk to buffer
      buffer += decoder.decode(value, { stream: true });
      // Process complete lines from buffer
      while (true) {
        const lineEnd = buffer.indexOf('\n');
        if (lineEnd === -1) break;
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta;
            const { content } = delta;
            if (content !== undefined) {
              summaryText += content;
              onSchemaCard(content, delta);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
    onDone();
    chatMessage.content = summaryText;
    emitter.emit('notification', { type: 'done', content: chatMessage.content, cardId: requestId, input });
  }

  setTemplateSchema(schema: any) {
    this.templateSchema = schema;
  }

  getTemplateSchema() {
    return this.templateSchema;
  }
}
