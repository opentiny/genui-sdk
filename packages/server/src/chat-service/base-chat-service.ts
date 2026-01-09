import type { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import type { IOpenaiCompatibleRequestOptions, IOpenaiCompatibleChunk } from '../types';

export abstract class BaseChatService {
  abstract chatStream(
    params: ChatCompletionCreateParamsBase,
    options?: IOpenaiCompatibleRequestOptions,
  ):
    | ReadableStream<IOpenaiCompatibleChunk>
    | Promise<ReadableStream<IOpenaiCompatibleChunk>>
    | AsyncGenerator<IOpenaiCompatibleChunk>
    | Promise<Response>;
}
