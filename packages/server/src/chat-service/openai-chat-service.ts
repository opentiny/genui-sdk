import { BaseChatService } from './base-chat-service';
import type { ChatCompletionChunk, ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import type { IOpenaiCompatibleRequestOptions } from '../types';
import { OpenAI } from 'openai';
export class OpenaiChatService extends BaseChatService {
  protected readonly client: OpenAI;

  constructor({ apiKey, baseURL }: { apiKey: string; baseURL: string }) {
    super();
    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  async *chatStream(
    params: ChatCompletionCreateParamsBase,
    options?: IOpenaiCompatibleRequestOptions,
  ): AsyncGenerator<ChatCompletionChunk> {
    const stream = await this.client.chat.completions.create(params, options);
    for await (const chunk of stream as unknown as AsyncGenerator<ChatCompletionChunk>) {
      yield chunk;
    }
  }
}
