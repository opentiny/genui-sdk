import { streamText } from 'ai';
import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';
import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic';
import { createDeepSeek, type DeepSeekProvider } from '@ai-sdk/deepseek';
import { BaseChatService } from './base-chat-service';
import type { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import type { IOpenaiCompatibleRequestOptions } from '../types';
import { openaiCompatibleTransfromChunk } from './openai-compatible-transform';

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

export class AiSdkChatService extends BaseChatService {
  protected readonly providerInstance: ProviderInstance;

  constructor({ apiKey, baseURL, provider }: { apiKey: string; baseURL: string; provider: ProviderType }) {
    super();
    const providerCreator = providerMap[provider];
    this.providerInstance = providerCreator({
      apiKey,
      baseURL,
    });
  }

  async *chatStream(params: ChatCompletionCreateParamsBase, options: IOpenaiCompatibleRequestOptions): AsyncGenerator<any> {
    const { temperature, messages, tools, model } = params;
    try {
      const modelInstance = this.providerInstance(model);
      const streamTextOptions = {
        model: modelInstance,
        temperature: temperature || undefined,
        messages,
        abortSignal: options.signal,
        tools,
        toolChoice: tools ? ('auto' as const) : undefined,
        // onError: (error: any) => {
        //   if (hasError) {
        //     return;
        //   }
        //   hasError = true;

        //   console.error('Error in chat-completion onError:', error);
        //   const actualError = error?.error?.cause ?? error?.error ?? error;
        //   const statusCode = actualError?.statusCode ?? 500;
        //   const responseBody = actualError?.responseBody || null;
        //   const message = actualError?.message + (responseBody ? `; error details: ${responseBody}` : '') || 'Unknown Error Type';
        //   const type = actualError?.name || actualError?.type || 'Unknown Error Type';
        //   const param = actualError?.param || null;
        //   const code = statusCode;
        //   const errorResponse = { message, type, param, code };

        //   throw new Error(JSON.stringify(errorResponse));

        // },
      };
      const stream = streamText(streamTextOptions as any);
      for await (const chunk of stream.fullStream) {
        const transformedChunk = openaiCompatibleTransfromChunk(chunk, { model: modelInstance });
        if (transformedChunk) {
          yield transformedChunk;
        }
      }
      return;
    } catch (error: any) {
      throw error;
    }
  }
}
