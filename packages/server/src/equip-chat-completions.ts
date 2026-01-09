import type { Express } from 'express';
import { FetchChatService } from './chat-service/fetch-chat-service';
import { Genui } from './chat-completions/chat-completions';
import { createChatCompletionHandler } from './handler/create-chat-completion';

export interface IEquipChatCompletionsOptions {
  route: string;
  apiKey: string;
  baseURL: string;
}

export function equipChatCompletions(app: Express, options: IEquipChatCompletionsOptions) {
  const { route, apiKey, baseURL } = options;

  const fetchChatService = new FetchChatService({
    apiKey,
    baseURL,
  });

  const genui = new Genui({ chatService: fetchChatService });

  const { handler: chatCompletionHandler } = createChatCompletionHandler({
    chatCompletions: genui.chatCompletions.bind(genui) as any,
  });

  app.post(route, chatCompletionHandler);
}
