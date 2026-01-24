import type { Express } from 'express';
import { FetchChatCompletions } from '@opentiny/genui-sdk-chat-completions';
import { createChatCompletionHandler } from './handler/create-chat-completion';

export interface IEquipChatCompletionsOptions {
  route: string;
  apiKey: string;
  baseURL: string;
}

export function equipChatCompletions(app: Express, options: IEquipChatCompletionsOptions) {
  const { route, apiKey, baseURL } = options;

  const chatCompletion = new FetchChatCompletions({
    apiKey,
    baseURL,
  });

  const { handler: chatCompletionHandler } = createChatCompletionHandler({
    chatCompletions: (params, options) => chatCompletion.chatStream(params, options),
  });

  app.post(route, chatCompletionHandler);
}
