import { CallSettings, LanguageModel, Prompt, streamText, TextStreamPart } from 'ai';
import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';
import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic';
import { createDeepSeek, type DeepSeekProvider } from '@ai-sdk/deepseek';
import type { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import type { AsyncIterableStream, ChatCompletionChunk, IRequestOptions } from '../types';
import { openaiCompatibleTransformChunk } from './openai-compatible-transform';
import { ChatCompletions } from '../chat-completions';
import { createAsyncIterableStream } from './async-iterable-stream';

/**
 * 目前支持的 Provider 类型
 */
type ProviderType = 'openai' | 'anthropic' | 'deepseek';

export type ProviderInstance = OpenAIProvider | AnthropicProvider | DeepSeekProvider;

/**
 * DefaultModelProvider 配置接口
 */
export interface IDefaultModelProviderConfig {
  provider: ProviderType;
  apiKey: string;
  baseURL?: string;
}

const providerMap = {
  openai: createOpenAI,
  deepseek: createDeepSeek,
  anthropic: createAnthropic,
};

export class AiSdkChatCompletions extends ChatCompletions<AsyncIterableStream<TextStreamPart<any>>, AsyncIterableStream<ChatCompletionChunk>> {
  protected readonly providerInstance: ProviderInstance;
  protected modelInstance: LanguageModel;

  constructor({ apiKey, baseURL, provider }: { apiKey: string; baseURL: string; provider: ProviderType }) {
    super();
    const providerCreator = providerMap[provider];
    this.providerInstance = providerCreator({
      apiKey,
      baseURL,
    });
  }

  protected async postTransform(stream: AsyncIterableStream<TextStreamPart<any>>) {
    return createAsyncIterableStream(new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(openaiCompatibleTransformChunk(chunk, { model: this.providerInstance }));
        }
        controller.close();
        return;
      },
    }));
  }

  protected async chatCompletions(
    params: ChatCompletionCreateParamsBase,
    options: IRequestOptions,
  ) {
    const { temperature, messages, tools, model } = params;
    try {
      this.modelInstance = this.providerInstance(model);
      const streamTextOptions = {
        model: this.modelInstance,
        temperature: temperature || undefined,
        messages,
        abortSignal: options.signal,
        tools,
        toolChoice: tools ? ('auto' as const) : undefined,
      };
      const stream = streamText(streamTextOptions as CallSettings & Prompt & { model: LanguageModel });
      return stream.fullStream;
    } catch (error: any) {
      throw error;
    }
  }
}
