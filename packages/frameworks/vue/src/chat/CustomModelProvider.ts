import { BaseModelProvider, type ChatCompletionRequest, type ChatCompletionResponse } from '@opentiny/tiny-robot-kit';
import { chat } from './chat-api';
import { reactive, toRaw } from 'vue';
import type { LLMConfig, IGenuiConfig, ICustomConfig } from './chat.types';
import { emitter } from './event-emitter';
import useSchemaStream from './useSchemaStream';
import type { IStreamDelta, IMessageItem, IChatMessage } from '../../../../core/src/protocols/chat'; //TODO: replace with package name
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from './i18n';

export interface ICustomModelProviderOptions {
  url: string;
  llmConfig: LLMConfig;
  config: IGenuiConfig;
  customConfig: ICustomConfig;
}
export class CustomModelProvider extends BaseModelProvider {
  private url: string;
  private llmConfig: LLMConfig;
  private customConfig: ICustomConfig;
  private newConfig: IGenuiConfig;
  constructor({ url, llmConfig, config, customConfig }: ICustomModelProviderOptions) {
    super({ provider: 'custom' });
    this.url = url;
    this.llmConfig = llmConfig;
    this.customConfig = customConfig;
    this.newConfig = config;
  }
  validateRequest(_: ChatCompletionRequest) {}

  changeLlmConfig(llmConfig: LLMConfig) {
    this.llmConfig = llmConfig;
  }

  async getData(request: ChatCompletionRequest) {
    return await chat(this.url, request.messages, this.llmConfig, request.options?.signal, this.customConfig);
  }

  async chat(_: ChatCompletionRequest) {
    return {} as ChatCompletionResponse;
  }

  async chatStream(request: any, handler: { onData: any; onDone: any; onError: any }) {
    const { onDone, onData, onError } = handler;
    let response: Response;
    try {
      response = await this.getData(request);
    } catch (error) {
      onDone({ type: 'error', error });
      return;
    }
    const reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    const toolCallIdMap: Record<string, IMessageItem & { type: 'tool' }> = {};
    const { handleSchemaStream, clearSchemaState } = useSchemaStream();
    const chatMessage = reactive<IChatMessage>({
      role: 'assistant',
      content: '',
      messages: [],
    });
    onData(chatMessage);

    /**
     * 发送通知事件
     */
    const emitNotification = (delta: IStreamDelta) => {
      const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
      if (lastMessage) {
        emitter.emit('notification', {
          type: lastMessage.type as 'markdown' | 'schema-card',
          delta,
          chatMessage: structuredClone(toRaw(chatMessage)),
        });
      }
    };

    /**
     * 处理 schema 和 markdown 流式内容
     */
    const onSchemaCard = (content: string, delta: IStreamDelta) => {
      handleSchemaStream(content, chatMessage);
      
      // 如果是新创建的 schema-card，需要生成 id
      const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
      if (lastMessage && lastMessage.type === 'schema-card' && !lastMessage.id) {
        lastMessage.id = uuidv4();
      }

      // 发送通知
      emitNotification(delta);
    };

    const onToolCall = (toolCalls: any[], delta: IStreamDelta) => {
      toolCalls.forEach((toolCall) => {
        const {
          id,
          function: { name, arguments: args },
        } = toolCall;
        const toolCallItem: IMessageItem & { type: 'tool' } = reactive({
          type: 'tool',
          name: name,
          formatPretty: true,
          status: 'running',
          content: args ? JSON.stringify({ arguments: args }, null, 2) : '',
          id,
        });
        toolCallIdMap[id] = toolCallItem;
        chatMessage.messages.push(toolCallItem);

        emitter.emit('notification', {
          type: 'tool',
          delta,
          toolCallData: structuredClone(toRaw(toolCallItem)),
          chatMessage: structuredClone(toRaw(chatMessage)),
        });
      });
    };

    const onToolResult = (toolCallsResult: any[], delta: IStreamDelta) => {
      const {
        id,
        function: { arguments: args, result },
      } = toolCallsResult[0];
      const toolCallItem = toolCallIdMap[id];
      if (toolCallItem) {
        toolCallItem.status = 'success';
        toolCallItem.content = JSON.stringify({ arguments: args, result }, null, 2);

        emitter.emit('notification', {
          type: 'tool',
          delta,
          toolCallData: structuredClone(toRaw(toolCallItem)),
          chatMessage: structuredClone(toRaw(chatMessage)),
        });

        if (this.newConfig.addToolCallContext) {
          const { t } = useI18n();
          chatMessage.content +=
            t('toolCall.context', {
              toolName: toolCallItem.name,
              toolParams: JSON.stringify(args),
              toolResult: JSON.stringify(result),
            }) + '\n\n';
        }
      }
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
            const { tool_calls, tool_calls_result, content } = delta;
            if (tool_calls) {
              onToolCall(tool_calls, delta);
              clearSchemaState();
            } else if (tool_calls_result) {
              onToolResult(tool_calls_result, delta);
            } else if (content) {
              onSchemaCard(content, delta);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
    onDone();
    emitter.emit('notification', {
      type: 'done',
      delta: {},
      chatMessage: structuredClone(toRaw(chatMessage)),
    });
  }
}
