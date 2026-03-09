import { reactive, toRaw } from 'vue';
import { BaseModelProvider, type ChatCompletionRequest, type ChatCompletionResponse } from '@opentiny/tiny-robot-kit';
import { PatternExtractor } from '@opentiny/genui-sdk-core';
import type { IStreamDelta } from '@opentiny/genui-sdk-core';
import { emitter } from '@opentiny/genui-sdk-vue';
import { templateChat } from './template-chat-api';
import type { LLMConfig, IChatMessage, IMessageItem, IMarkdownMessageItem } from './chat.types';

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
    return templateChat({
      url: this.url,
      messages: request.messages,
      signal: request.options?.signal,
      templateSchema: this.templateSchema,
      llmConfig: this.llmConfig,
    });
  }

  async chat(_: ChatCompletionRequest) {
    return {} as ChatCompletionResponse;
  }

  async chatStream(request: any, handler: { onData: any; onDone: any; onError: any }) {
    const { onDone, onData } = handler;
    // 8 位随机 ID
    const requestId = Math.random().toString(36).substring(2, 10);
    const response = await this.getData(request);
    let reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let chatMessage: IChatMessage = reactive({
      role: 'assistant',
      content: '',
      messages: [] as IMessageItem[],
    });
    const { content: input, messageId } = request.messages[request.messages.length - 1];
    onData(chatMessage);

    const onMarkdown = (content: string, delta: IStreamDelta) => {
      if (
        chatMessage.messages.length > 0 &&
        chatMessage.messages[chatMessage.messages.length - 1].type === 'markdown'
      ) {
        chatMessage.messages[chatMessage.messages.length - 1].content += content;
      } else {
        chatMessage.messages.push({
          type: 'markdown',
          content,
          input,
          cardId: messageId,
        });
      }
      emitter.emit('notification', {
        type: 'markdown',
        delta,
        chatMessage: structuredClone(toRaw(chatMessage)),
      });
    };

    /**
     * 处理 schema/jsonPatch 和 markdown 流式内容
     */
    const onHandledContent = (
      content: string,
      delta: IStreamDelta,
      currentSchemaType: 'schema-card' | 'json-patch',
    ) => {
      if (
        chatMessage.messages.length > 0 &&
        chatMessage.messages[chatMessage.messages.length - 1].type === currentSchemaType
      ) {
        chatMessage.messages[chatMessage.messages.length - 1].content += content;
      } else {
        chatMessage.messages.push({
          type: currentSchemaType,
          content,
          input,
          cardId: messageId,
          generatedTime: '',
          schema: '',
          prevSchema: '',
        });
      }
    };

    let currentDelta: IStreamDelta = {};
    const schemaStart = '```schemaJson';
    const patchStart = '```jsonPatch';
    const endFlag = '```';
    const getPartialStartRegString = (flag: string) => {
      return flag
        .split('')
        .reverse()
        .reduce((acc, cur) => {
          return `${cur}(${acc})?`;
        }, '');
    };

    const jsonPatchExtractor = new PatternExtractor({
      onNormalWrite: (value) => onMarkdown(value, currentDelta),
      onHandledWrite: (value) => onHandledContent(value, currentDelta, 'json-patch'),
      regExpMap: {
        start: {
          full: new RegExp(`${patchStart}`),
          partial: new RegExp(`(${getPartialStartRegString(patchStart)})$`),
        },
        end: {
          full: new RegExp(`\\n\\s*${endFlag}`),
          partial: new RegExp(`\\n(\\s*${getPartialStartRegString(endFlag)})?$`),
        },
      },
    });

    const schemaJsonExtractor = new PatternExtractor({
      onNormalWrite: (value) => jsonPatchExtractor.handleContent(value),
      onHandledWrite: (value) => onHandledContent(value, currentDelta, 'schema-card'),
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
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') break;
        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta || {};
          const { tool_calls, tool_calls_result, content, reasoning_content } = delta;
          // 模板流仅处理 content（schema/markdown），其余分支预留与 CustomModelProvider 一致
          if (reasoning_content) {
            // 模板场景暂不处理 reasoning
          } else if (tool_calls) {
            // 模板场景暂不处理 tool_calls
          } else if (tool_calls_result) {
            // 模板场景暂不处理 tool_calls_result
          } else if (content !== undefined) {
            currentDelta = delta;
            schemaJsonExtractor.handleContent(content);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    onDone();
    emitter.emit('notification', {
      type: 'done',
      delta: {},
      chatMessage: structuredClone(toRaw(chatMessage)),
      cardId: requestId,
      input,
    });
  }

  setTemplateSchema(schema: any) {
    this.templateSchema = schema;
  }

  getTemplateSchema() {
    return this.templateSchema;
  }
}
