import { BaseModelProvider, type ChatCompletionRequest, type ChatCompletionResponse } from '@opentiny/tiny-robot-kit';
import { chat } from './chat-api';
import { reactive, toRaw } from 'vue';
import type { IChatConfig, ICustomComponentItem, CustomFetch, ICustomActionItem } from './chat.types';
import type { IGenPromptSnippet, IGenPromptExample } from '@opentiny/genui-sdk-core';
import { emitter } from './event-emitter';
import type { IStreamDelta, IMessageItem, IChatMessage } from '@opentiny/genui-sdk-core';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from './i18n';
import { PatternExtractor } from '@opentiny/genui-sdk-core';

export interface ICustomModelProviderOptions {
  url: string;
  model: string;
  temperature: number;
  chatConfig: IChatConfig;
  customComponents: ICustomComponentItem[];
  customSnippets: IGenPromptSnippet[];
  customExamples: IGenPromptExample[];
  customActions: ICustomActionItem[];
  customFetch?: CustomFetch;
}
export class CustomModelProvider extends BaseModelProvider {
  private url: string;
  private model: string;
  private temperature: number;
  private customComponents: ICustomComponentItem[];
  private customSnippets: IGenPromptSnippet[];
  private customExamples: IGenPromptExample[];
  private customActions: ICustomActionItem[];
  private chatConfig: IChatConfig;
  private customFetch?: CustomFetch;
  constructor({ url, model, temperature, chatConfig, customComponents, customSnippets, customExamples, customActions, customFetch }: ICustomModelProviderOptions) {
    super({ provider: 'custom' });
    this.url = url;
    this.model = model;
    this.temperature = temperature;
    this.customComponents = customComponents;
    this.customSnippets = customSnippets;
    this.customExamples = customExamples;
    this.customActions = customActions;
    this.chatConfig = chatConfig;
    this.customFetch = customFetch;
  }
  validateRequest(_: ChatCompletionRequest) { }

  changeLlmConfig(model: string, temperature: number) {
    this.model = model;
    this.temperature = temperature;
  }

  async getData(request: ChatCompletionRequest) {
    return await chat(
      {
        url: this.url,
        messages: request.messages,
        model: this.model,
        temperature: this.temperature,
        signal: request.options?.signal,
        customComponents: this.customComponents,
        customSnippets: this.customSnippets,
        customExamples: this.customExamples,
        customActions: this.customActions,
        customFetch: this.customFetch,
      }
    );
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
    const signal = request.options?.signal;
      signal?.addEventListener('abort',
        () => {
          reader.cancel();
        },
        { once: true }
      )
    
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    const toolCallIdMap: Record<string, IMessageItem & { type: 'tool' }> = {};
    let inProcessToolCallId;
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
    const onMarkdown = (content: string, delta: IStreamDelta) => {
      if (chatMessage.messages.length > 0 && chatMessage.messages[chatMessage.messages.length - 1].type === 'markdown') {
        chatMessage.messages[chatMessage.messages.length - 1].content += content;
      } else {
        chatMessage.messages.push({
          type: 'markdown',
          content: content
        });
      }
      emitNotification(delta);
    };
    const onSchemaJSON = (content: string, delta: IStreamDelta) => {
      if (chatMessage.messages.length > 0 && chatMessage.messages[chatMessage.messages.length - 1].type === 'schema-card') {
        chatMessage.messages[chatMessage.messages.length - 1].content += content;
      } else {
        chatMessage.messages.push({
          type: 'schema-card',
          content: content,
          id: uuidv4(),
        });
      }
      emitNotification(delta);
    }

    const onToolCall = (toolCalls: any[], delta: IStreamDelta) => {
      toolCalls.forEach((toolCall) => {
        const {
          id,
          function: { name, arguments: argsDelta },
        } = toolCall;

        let toolCallItem: IMessageItem & { type: 'tool' };
        // 有id的就是首次工具调用返回
        if (id) {
          inProcessToolCallId = id;
          toolCallItem = reactive({
            type: 'tool',
            name: name,
            formatPretty: true,
            status: 'running',
            content: JSON.stringify({ arguments: argsDelta || '' }, null, 2),
            id,
          });
          toolCallIdMap[id] = toolCallItem;
          chatMessage.messages.push(toolCallItem);
        } else {
          toolCallItem = toolCallIdMap[inProcessToolCallId];
          const prevArgs = JSON.parse(toolCallItem.content).arguments;
          const nextArgs = prevArgs + (argsDelta || '');
  
          toolCallItem.content = JSON.stringify({ arguments: nextArgs }, null, 2);
        }



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

        if (this.chatConfig.addToolCallContext) {
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
    let currentDelta: IStreamDelta = {};
    const patternExtractor = new PatternExtractor({
      onNormalWrite: (value) => onMarkdown(value, currentDelta),
      onHandledWrite: (value) => onSchemaJSON(value, currentDelta),
    });
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
            const delta = chunk.choices?.[0]?.delta || {};
            const { tool_calls, tool_calls_result, content } = delta;
            if (tool_calls?.length) {
              onToolCall(tool_calls, delta);
              patternExtractor.reset();
            } else if (tool_calls_result) {
              onToolResult(tool_calls_result, delta);
            } else if (content) {
              currentDelta = delta;
              patternExtractor.handleContent(content);
              chatMessage.content += content;
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
