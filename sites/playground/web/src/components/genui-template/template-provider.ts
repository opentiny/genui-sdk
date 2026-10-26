import {
  responseToAsyncGenerator,
  type EventEmitter,
  type IResponseHandler,
} from '@opentiny/genui-sdk-vue';
import type { ChatMessage, MessageRequestBody, ResponseProvider } from '@opentiny/tiny-robot-kit';
import type { IStreamData } from '@opentiny/genui-sdk-core';
import { templateChat } from './template-chat-api';
import { getBackendChatMessages, getLastUserMessage } from './template-chat-utils';
import { segmentsToPlainText, type ComposerSegment } from './schema-composer';
import { createTemplateResponseHandlers } from './template-response-handlers';
import type { ITemplateUserMessageItem, LLMConfig } from './chat.types';

function resolveDisplayInput(lastUserMessage: { content?: unknown; messages?: unknown } | undefined): string {
  const items = lastUserMessage?.messages as ITemplateUserMessageItem[] | undefined;
  const segments: ComposerSegment[] | undefined = items?.find((item) => item.type === 'template-user')?.segments;
  return segments?.length ? segmentsToPlainText(segments) : String(lastUserMessage?.content ?? '');
}

export interface ITemplateModelProviderOptions {
  url: string;
  llmConfig: LLMConfig;
  emitter: EventEmitter;
}

export class TemplateModelProvider {
  private url: string;
  private llmConfig: LLMConfig;
  private templateSchema: unknown;
  private emitter: EventEmitter;
  private responseContext: Record<string, unknown> = {};

  readonly responseProvider: ResponseProvider = async (
    request: MessageRequestBody,
    signal: AbortSignal,
  ) => {
    const messages = request.messages as ChatMessage[];
    const lastUserMessage = getLastUserMessage(messages);
    this.responseContext = {
      messageId: String(lastUserMessage?.messageId ?? ''),
      input: resolveDisplayInput(lastUserMessage),
      emitter: this.emitter,
      requestId: Math.random().toString(36).substring(2, 10),
    };
    const response = await templateChat({
      url: this.url,
      messages: getBackendChatMessages(messages),
      signal,
      templateSchema: this.templateSchema,
      llmConfig: this.llmConfig,
    });
    return responseToAsyncGenerator(response, signal);
  };

  constructor({ url, llmConfig, emitter }: ITemplateModelProviderOptions) {
    this.url = url;
    this.llmConfig = llmConfig;
    this.emitter = emitter;
  }

  getResponseHandlers(): IResponseHandler<IStreamData>[] {
    return createTemplateResponseHandlers();
  }

  getResponseContext() {
    return this.responseContext;
  }

  changeLlmConfig(llmConfig: LLMConfig) {
    this.llmConfig = llmConfig;
  }

  setTemplateSchema(schema: unknown) {
    this.templateSchema = schema;
  }

  getTemplateSchema() {
    return this.templateSchema;
  }
}
