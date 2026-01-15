# Chat 组件 - 自定义 Fetch

`GenuiChat` 组件支持自定义 fetch 函数，允许你完全自定义 HTTP 请求的实现方式。这对于需要集成第三方 SDK（如 OpenAI SDK）、添加认证、处理工具调用、实现自定义流式响应等场景非常有用。

## 参数说明

- `url`: 请求地址
- `options.method`: HTTP 方法（通常为 'POST'）
- `options.headers`: 请求头对象
- `options.body`: 请求体（JSON 字符串），包含 `messages`、`model`、`temperature`、`metadata` (带有处理好的`customComponents`/`customSnippets`/`customExamples`/`customActions`)
- `options.signal`: AbortSignal，用于取消请求

## 返回值

必须返回 `Response` 对象或 `Promise<Response>`。响应需要符合 OpenAI 兼容的流式格式（SSE），或者返回标准的 JSON 响应。

## 使用场景

### 添加认证头

通过 `customFetch` prop 传递自定义的 fetch 函数：

```vue
<template>
  <GenuiChat :url="url" model="deepseek-v3.2" :customFetch="customFetch" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import type { CustomFetch } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customFetch: CustomFetch = async (url, options) => {
  // 添加认证头
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
};
</script>
```

### 处理工具调用和多轮对话

当使用 OpenAI SDK 并需要支持工具调用时，可以在 `customFetch` 中实现多轮对话逻辑：

```typescript
export function createOpenAICustomFetchWithTools(config: OpenAIConfig): CustomFetch {
  return async (url, options) => {
    const requestBody = JSON.parse(options.body);
    const { messages, model, temperature } = requestBody;

    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true,
    });

    const tools = getAvailableTools(); // 获取可用工具
    const maxSteps = 20; // 最大工具调用步骤数

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
                model,
                messages: currentMessages,
                temperature,
                tools: tools.length > 0 ? tools : undefined,
                tool_choice: 'auto',
                stream: true,
              },
              {
                signal: options.signal,
              },
            );

            let assistantMessage: any = { role: 'assistant', content: null };
            let toolCalls: any[] = [];
            let contentDelta = '';

            // 处理流式响应
            for await (const chunk of stream) {
              const choice = chunk.choices[0];
              if (!choice) continue;

              const delta = choice.delta;

              // 处理内容增量
              if (delta.content) {
                contentDelta += delta.content;
                // 发送内容块...
              }

              // 处理工具调用
              if (delta.tool_calls) {
                // 累积工具调用数据...
              }

              // 处理完成
              if (choice.finish_reason) {
                if (choice.finish_reason === 'tool_calls' && toolCalls.length > 0) {
                  // 执行工具调用
                  currentMessages.push(assistantMessage);

                  // 执行所有工具调用并添加结果到消息历史
                  for (const toolCall of toolCalls) {
                    const args = JSON.parse(toolCall.function.arguments);
                    const result = await executeToolCall(toolCall.function.name, args);

                    currentMessages.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      content: result,
                    });
                  }

                  stepCount++;
                  continue; // 继续下一轮对话
                } else {
                  // 正常完成
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  break;
                }
              }
            }
          }
        } catch (error) {
          // 错误处理...
        }
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
  };
}
```

## 响应格式要求

`customFetch` 返回的 Response 需要符合以下格式之一：

### 流式响应（SSE 格式）

```text
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","model":"gpt-4","created":1234567890,"choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","model":"gpt-4","created":1234567890,"choices":[{"index":0,"delta":{"content":" World"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","model":"gpt-4","created":1234567890,"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```
