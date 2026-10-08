import type {
  ChatCompletionResponse,
  ChatCompletionCreateParamsBase,
  IChatCompletionCreateParams,
  IChatCompletionsConfig,
  IRequestOptions,
} from "./types";
import { requestTransform } from "./request-transform";

export abstract class ChatCompletions<T = ChatCompletionResponse, R = ChatCompletionResponse> {
  protected readonly materialsMeta?: IChatCompletionsConfig['materialsMeta'];

  constructor(config?: IChatCompletionsConfig) {
    this.materialsMeta = config?.materialsMeta;
  }

  protected async preTransform(params: IChatCompletionCreateParams): Promise<ChatCompletionCreateParamsBase> {
    return requestTransform(params, { materialsMeta: this.materialsMeta });
  }
  protected async postTransform(response: T): Promise<R> {
    return response as unknown as R;
  }

  async chatStream(
    params: IChatCompletionCreateParams,
    options?: IRequestOptions
  ): Promise<R> {
    try {
      const chatParams = await this.preTransform(params);
      const response = await this.chatCompletions(chatParams, options);
      const IterableStream = await this.postTransform(response);
      return IterableStream;
    } catch (error) {
      throw error;
    }
  }

  protected abstract chatCompletions(
    params: ChatCompletionCreateParamsBase,
    options?: IRequestOptions
  ): Promise<T>;
}
