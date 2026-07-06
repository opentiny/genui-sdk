import { sseStreamToGenerator } from '@opentiny/tiny-robot-kit';
import type { MessageRequestBody } from '@opentiny/tiny-robot-kit';
import { templateChat } from '../genui-template/template-chat-api';
import type { LLMConfig } from '../genui-template/chat.types';

export interface TemplateResponseProviderOptions {
  getUrl: () => string;
  getLlmConfig: () => LLMConfig;
  getTemplateSchema: () => unknown;
}

export function createTemplateResponseProvider(getOptions: () => TemplateResponseProviderOptions) {
  return async (requestBody: MessageRequestBody, abortSignal: AbortSignal) => {
    const options = getOptions();
    const response = await templateChat({
      url: options.getUrl(),
      messages: requestBody.messages,
      signal: abortSignal,
      templateSchema: options.getTemplateSchema(),
      llmConfig: options.getLlmConfig(),
    });
    return sseStreamToGenerator(response, { signal: abortSignal });
  };
}
