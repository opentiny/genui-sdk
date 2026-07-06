import { sseStreamToGenerator } from '@opentiny/tiny-robot-kit';
import type { MessageRequestBody } from '@opentiny/tiny-robot-kit';
import { chat } from '../chat/chat-api';
import type { GenuiChatRuntimeOptions } from './types';

export function createGenuiResponseProvider(getOptions: () => GenuiChatRuntimeOptions) {
  return async (requestBody: MessageRequestBody, abortSignal: AbortSignal) => {
    const options = getOptions();
    const response = await chat({
      url: options.url,
      messages: requestBody.messages,
      model: options.model,
      temperature: options.temperature,
      signal: abortSignal,
      customComponents: options.customComponents,
      customSnippets: options.customSnippets,
      customExamples: options.customExamples,
      customActions: options.customActions,
      customFetch: options.customFetch,
    });
    return sseStreamToGenerator(response, { signal: abortSignal });
  };
}
