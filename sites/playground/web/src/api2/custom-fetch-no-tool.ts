import OpenAI from 'openai';
import type { CustomRequest } from '@opentiny/genui-sdk-vue';
import { availableTools } from './tools';

/**
 * OpenAI SDK 配置
 */
export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
}

/**
 * 使用 OpenAI SDK 创建 customRequest 函数（单轮对话，直接透传流式返回）
 *
 * - 不再做多轮会话循环
 * - 不再在前端执行 / 拼装工具调用结果
 * - OpenAI 返回什么 chunk，就按原样以 SSE data 行流式返回
 */
export function createOpenAICustomFetch(config: OpenAIConfig): CustomRequest {
  return async (
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body: string;
      signal?: AbortSignal;
    },
  ): Promise<Response> => {
    // 解析请求体（保留 metadata 等字段，原样透传给后端/模型）
    const requestBody = JSON.parse(options.body);

    try {
      const tools = Object.values(availableTools).map((tool) => tool.definition);

      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        dangerouslyAllowBrowser: true,
      });

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            // 只发起一次流式请求
            const stream = await openai.chat.completions.create(
              {
                // 直接把请求体里的参数透传给 OpenAI
                ...requestBody,
                tools: tools.length > 0 ? tools : undefined,
                tool_choice: tools.length > 0 ? 'auto' : undefined,
                stream: true,
              } as any,
              {
                signal: options.signal,
              },
            );

            // 将 OpenAI 返回的每个 chunk 原样包成 SSE data 行
            for await (const chunk of stream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }

            // 结束标记
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
          // 这里可以做一些清理工作，如果需要的话
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        status: 200,
      });
    } catch (error: any) {
      console.error('[OpenAI SDK Error]', {
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
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'sk-test',
  baseURL: 'http://localhost:3100/',
});
