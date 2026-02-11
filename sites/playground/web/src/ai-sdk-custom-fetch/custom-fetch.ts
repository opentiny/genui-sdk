import { streamText, stepCountIs } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import type { CustomFetch } from '@opentiny/genui-sdk-vue';
import { availableTools } from './tools';
import { openaiCompatibleTransfromChunk } from './openai-compatible-transform';

/**
 * OpenAI SDK 配置
 */
export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
}

/**
 * 使用 ai-sdk 创建 customFetch 函数（自动处理工具调用）
 *
 * @param config OpenAI 配置
 * @returns CustomFetch 函数
 */
export function createOpenAICustomFetch(config: OpenAIConfig): CustomFetch {
  return async (
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body: string;
      signal?: AbortSignal;
    },
  ): Promise<Response> => {
    // 解析请求体
    const requestBody = JSON.parse(options.body);
    const { messages, llmConfig, metadata } = requestBody;

    try {
      const deepseek = createDeepSeek({
        apiKey: config.apiKey,
        baseURL: 'http://localhost:3100/',
      });

      const model = deepseek(llmConfig?.model || 'gpt-4');

      // 优先使用 metadata 中的 tools 配置，如果没有则使用默认的 tools
      let toolsToUse = availableTools;

      // 使用 ai-sdk 的 streamText，自动处理工具调用
      const result = streamText({
        model,
        messages,
        temperature: llmConfig?.temperature,
        tools: toolsToUse,
        toolChoice: 'auto',
        abortSignal: options.signal,
        stopWhen: stepCountIs(20),
      });

      // 将流转换为 SSE 格式的 Response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of result.fullStream) {
              // 转换为 OpenAI 兼容格式
              const transformedChunk = openaiCompatibleTransfromChunk(chunk, { model });
              if (transformedChunk) {
                const sseData = `data: ${JSON.stringify(transformedChunk)}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              }
            }
            // 发送结束标记
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            const errorData = {
              error: {
                message: error instanceof Error ? error.message : 'Unknown error',
                type: 'stream_error',
              },
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
            controller.error(error);
          }
        },
        cancel() {
          // 清理资源
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        status: 200,
      });
    } catch (error: any) {
      console.error('[AI SDK Error]', {
        url,
        error: error.message,
      });

      // 返回错误响应
      return new Response(
        JSON.stringify({
          error: {
            message: error.message,
            type: error.type || 'unknown',
            code: 500,
          },
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  };
}

/**
 * 默认的 customFetch 实现（使用环境变量配置）
 */
export const defaultCustomFetch = createOpenAICustomFetch({
  apiKey: 'sk-test',
  baseURL: 'http://localhost:3100/',
});
