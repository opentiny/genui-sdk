import { BaseChatService } from './base-chat-service';
import type { ChatCompletionChunk, ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import type { IOpenaiCompatibleRequestOptions } from '../types';

/**
 * 使用原生 fetch 调用 OpenAI 兼容接口的实现
 * 要求上游接口返回的是 OpenAI 风格的 SSE 流：`data: {...}\n\n`
 */
export class FetchChatService extends BaseChatService {
  private readonly apiKey: string;
  private readonly baseURL: string;

  constructor({ apiKey, baseURL }: { apiKey: string; baseURL: string }) {
    super();
    this.apiKey = apiKey;
    // 规整一下 baseURL，避免结尾多 /
    this.baseURL = baseURL.replace(/\/$/, '');
  }

  /**
   * 通过 fetch 调用 OpenAI 兼容的 /chat/completions 流式接口
   * 将 SSE 数据解析为 ChatCompletionChunk，并以 AsyncGenerator 形式向上游暴露
   */
  async chatStream(
    params: ChatCompletionCreateParamsBase,
    options?: IOpenaiCompatibleRequestOptions,
  ): Promise<Response> {
    const url = `${this.baseURL}/chat/completions`;

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...params,
        stream: true,
      }),
      signal: options?.signal ?? undefined,
    };

    const response = await fetch(url, fetchOptions);

    return response;
  }
}
