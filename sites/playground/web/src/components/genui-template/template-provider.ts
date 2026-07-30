import {
  CustomModelProvider,
  type EventEmitter,
} from '@opentiny/genui-sdk-vue';
import type { ChatCompletionRequest } from '@opentiny/tiny-robot-kit';
import { templateChat } from './template-chat-api';
import { getBackendChatMessages, getLastUserMessage } from './template-chat-utils';
import { createTemplateResponseHandlers } from './template-response-handlers';
import type { LLMConfig } from './chat.types';

export interface ITemplateModelProviderOptions {
  url: string;
  llmConfig: LLMConfig;
  emitter: EventEmitter;
}

export class TemplateModelProvider extends CustomModelProvider {
  private url: string;
  private llmConfig: LLMConfig;
  private templateSchema: unknown;
  private emitter: EventEmitter;

  constructor({ url, llmConfig, emitter }: ITemplateModelProviderOptions) {
    super({
      getChatOptions: () => ({
        url: this.url,
        model: this.llmConfig.model,
        temperature: this.llmConfig.temperature ?? 0.3,
        chatConfig: {},
        customComponents: [],
        customSnippets: [],
        customExamples: [],
        customActions: [],
      }),
    });
    this.url = url;
    this.llmConfig = llmConfig;
    this.emitter = emitter;
    this.setResponseHandlers(createTemplateResponseHandlers());
  }

  changeLlmConfig(llmConfig: LLMConfig) {
    this.llmConfig = llmConfig;
  }

  override async getData(request: ChatCompletionRequest) {
    return templateChat({
      url: this.url,
      messages: getBackendChatMessages(request.messages),
      signal: request.options?.signal,
      templateSchema: this.templateSchema,
      llmConfig: this.llmConfig,
    });
  }

  protected override setupStreamContext(
    context: Record<string, unknown>,
    request: ChatCompletionRequest,
  ) {
    super.setupStreamContext(context, request);
    const lastUserMessage = getLastUserMessage(request.messages);
    context.messageId = String(lastUserMessage?.messageId ?? '');
    context.input = String(lastUserMessage?.content ?? '');
    context.emitter = this.emitter;
    context.requestId = Math.random().toString(36).substring(2, 10);
  }

  setTemplateSchema(schema: unknown) {
    this.templateSchema = schema;
  }

  getTemplateSchema() {
    return this.templateSchema;
  }
}
