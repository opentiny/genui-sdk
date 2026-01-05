import { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions.mjs';
import { IOpenaiCompatibleRequestOptions } from '../types';
import { requestTransform } from './request-transform';
import { BaseChatService } from '../chat-service';


export class Genui {
  protected readonly chatService: BaseChatService;

  constructor({ chatService }: { chatService: BaseChatService }) {
    this.chatService = chatService;
  }

  async chatCompletions(params: ChatCompletionCreateParamsBase, options?: IOpenaiCompatibleRequestOptions) {
    try {
      const genuiChatParams = requestTransform(params as ChatCompletionCreateParamsBase & { metadata?: { tinygenui?: string } });
      const stream = await this.chatService.chatStream(genuiChatParams, options);
      return stream;
    } catch (error) {
      throw error;
    }

  }
}