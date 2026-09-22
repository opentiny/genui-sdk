import type { Express } from 'express';
import type { IMaterialsMeta } from '@opentiny/genui-sdk-core';
import { FetchChatCompletions } from '@opentiny/genui-sdk-chat-completions';
import { createChatCompletionHandler } from './handler/create-chat-completion';

export interface IEquipChatCompletionsOptions {
  route: string;
  apiKey: string;
  baseURL: string;
  materialsMeta?: IMaterialsMeta;
}

export function equipChatCompletions(app: Express, options: IEquipChatCompletionsOptions) {
  const { route, apiKey, baseURL, materialsMeta } = options;

  const chatCompletion = new FetchChatCompletions({
    apiKey,
    baseURL,
    materialsMeta,
  });

  const { handler: chatCompletionHandler } = createChatCompletionHandler({
    chatCompletions: (params, options) => chatCompletion.chatStream(params, options),
  });

  app.post(route, chatCompletionHandler);
}
