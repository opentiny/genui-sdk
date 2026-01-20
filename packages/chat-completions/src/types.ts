import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions";
import type { IGenPromptConfig } from "@opentiny/genui-sdk-core";

declare global {
  export type JsonSerialized<T> = string & {
    __json_serialized: T;
  };
  interface JSON {
    parse<T>(text: JsonSerialized<T>): T;
    stringify<T>(value: T): JsonSerialized<T>;
  }
}

export interface IRequestOptions {
  signal?: AbortSignal | undefined | null;
  [key: string]: unknown;
}


export type IChatCompletionCreateParams = ChatCompletionCreateParamsBase & {
  metadata?: {
    tinygenui?: JsonSerialized<IGenPromptConfig>;
  };
};
export type { ChatCompletionCreateParamsBase, ChatCompletionChunk };

export type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;
export type APIResponse<T> = Response & { body: T};
export type ChatCompletionResponse<T = Uint8Array> = APIResponse<ReadableStream<T>>;