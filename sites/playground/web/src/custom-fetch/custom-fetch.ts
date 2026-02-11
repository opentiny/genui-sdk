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
 * 执行工具调用
 */
async function executeToolCall(toolName: string, args: any): Promise<string> {
  const tool = availableTools[toolName];
  if (!tool) {
    throw new Error(`Tool ${toolName} not found`);
  }

  try {
    const result = await tool.execute(args);
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * 累积工具调用数据
 * 将流式返回的工具调用增量数据累积成完整的工具调用对象
 */
function accumulateToolCalls(toolCalls: any[], toolCallDeltas: any[]): void {
  for (const delta of toolCallDeltas) {
    const index = delta.index ?? 0;
    const toolCall = (toolCalls[index] ??= {
      id: delta.id ?? '',
      type: 'function',
      function: { name: '', arguments: '' },
    });
    if (delta.id) toolCall.id = delta.id;
    if (delta.function?.name) toolCall.function.name += delta.function.name;
    if (delta.function?.arguments) toolCall.function.arguments += delta.function.arguments;
  }
}

/**
 * 执行单个工具调用并返回结果
 */
async function executeSingleToolCall(toolCall: any, currentMessages: any[]): Promise<any> {
  const createResult = (result: string) => {
    currentMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
    return {
      id: toolCall.id,
      type: 'function',
      function: { name: toolCall.function.name, arguments: toolCall.function.arguments, result },
    };
  };
  try {
    const args = JSON.parse(toolCall.function.arguments);
    const result = await executeToolCall(toolCall.function.name, args);
    return createResult(result);
  } catch (error) {
    return createResult(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
  }
}

/**
 * 使用 OpenAI SDK 创建 customRequest 函数（处理工具调用和多轮对话）
 *
 * @param config OpenAI 配置
 * @returns CustomRequest 函数
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
    // 解析请求体
    const requestBody = JSON.parse(options.body);
    const { messages, model, temperature } = requestBody;

    try {
      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        dangerouslyAllowBrowser: true,
      });

      const tools = Object.values(availableTools).map((tool) => tool.definition);
      const maxSteps = 20; // 最大工具调用步骤数

      // 将流转换为 SSE 格式的 Response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            let currentMessages = [...messages];
            let stepCount = 0;

            while (stepCount < maxSteps) {
              // 创建流式请求
              const stream = await openai.chat.completions.create(
                {
                  model: 'deepseek/deepseek-reasoner',
                  messages: currentMessages,
                  temperature,
                  tools: tools.length > 0 ? tools : undefined,
                  tool_choice: tools.length > 0 ? 'auto' : undefined,
                  stream: true,
                },
                {
                  signal: options.signal,
                },
              );

              let toolCalls: any[] = [];
              let hasToolCalls = false;

              // 处理流式响应
              for await (const chunk of stream) {
                const choice = chunk.choices?.[0];
                if (!choice) continue;

                const delta = choice.delta;

                // 累积工具调用数据
                if (delta.tool_calls) {
                  hasToolCalls = true;
                  accumulateToolCalls(toolCalls, delta.tool_calls);
                }

                // 透传原始 chunk
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));

                // 处理完成原因
                if (choice.finish_reason === 'tool_calls' && toolCalls.length > 0) {
                  // 执行工具调用
                  currentMessages.push({ role: 'assistant', content: null, tool_calls: toolCalls });
                  const toolResults = await Promise.all(
                    toolCalls.map((toolCall, i) =>
                      executeSingleToolCall(toolCall, currentMessages).then((result) => ({ ...result, index: i })),
                    ),
                  );

                  // 发送工具调用结果
                  if (toolResults.length > 0) {
                    const toolResultChunk = {
                      id: chunk.id,
                      object: 'chat.completion.chunk',
                      model: chunk.model || model,
                      created: chunk.created || Math.floor(Date.now() / 1000),
                      choices: [{ index: 0, delta: { tool_calls_result: toolResults }, finish_reason: 'tool_calls' }],
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolResultChunk)}\n\n`));
                  }

                  stepCount++;
                  break;
                }

                if (choice.finish_reason) {
                  // 正常完成，退出外层循环
                  break;
                }
              }

              // 如果没有工具调用，退出循环
              if (!hasToolCalls) {
                break;
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
        }
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
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'sk-trial',
  baseURL: 'http://localhost:3101/',
});
