import type { ChatCompletionChunk } from 'openai/resources/chat/completions';

export interface IOpenaiCompatibleRequestOptions {
  maxRetries?: number;
  timeout?: number;
  signal?: AbortSignal | undefined | null;
}

export type IOpenaiCompatibleChunk = ChatCompletionChunk;
