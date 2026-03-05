import { ChatCompletions } from "./chat-completions";
import type {
  ChatCompletionCreateParamsBase,
  IRequestOptions,
  ChatCompletionResponse
} from "./types";

export class FetchChatCompletions extends ChatCompletions<Response, ChatCompletionResponse> {
  protected readonly apiKey: string;
  protected readonly baseURL: string;

  constructor(config: { apiKey: string; baseURL: string }) {
    super();
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL.replace(/\/$/, '');
  }

  protected async chatCompletions(
    params: ChatCompletionCreateParamsBase,
    options?: IRequestOptions
  ): Promise<Response> {
    const url = `${this.baseURL}/chat/completions`;

    const fetchOptions: RequestInit = {
      ...(options ?? {}),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...((options?.headers as Record<string, string>) ?? {}),
      },
      body: JSON.stringify({
        ...params,
        stream: options?.stream ?? true,
      }),
    };

    const response = (await fetch(url, fetchOptions));

    return response;
  }
}
