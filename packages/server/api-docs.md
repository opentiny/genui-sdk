## 核心模块使用说明

### ChatCompletion 类

`ChatCompletion` 类是聊天补全的核心，负责：

- 接收 OpenAI 格式的请求参数
- 在preTransform阶段
- 调用底层的 `ChatService` 获取流式响应

```typescript
import { FetchChatCompletion } from '@opentiny/genui-sdk-chat-completion';

const chatCompletion = new FetchChatCompletion({
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
});

const response = await chatCompletion.chatStream({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
});
```

### ChatCompletion 实现

#### FetchChatCompletion

使用原生 `fetch` 调用 OpenAI 兼容接口，返回 `Response` 对象：

```typescript
import { FetchChatCompletion } from '@opentiny/genui-sdk-chat-completion';

const chatCompletion = new FetchChatCompletion({
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
});
```


#### AiSdkChatService

使用 Vercel AI SDK，支持多种提供商， 返回`AsyncIterableStream`：

```typescript
import { AiSdkChatCompletion } from '@opentiny/genui-sdk-chat-completion';

const chatCompletion = new AiSdkChatCompletion({
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
  provider: 'openai', // 'openai' | 'anthropic' | 'deepseek'
});
```

### 请求处理器

`createChatCompletionHandler` 创建通用的 HTTP 请求处理器，支持：

- 解析请求体
- 处理流式响应（Response 对象或 AsyncIterable）
- 错误处理
- 客户端断开连接处理
- SSE 格式输出

```typescript
import { createChatCompletionHandler } from '@opentiny/genui-sdk-server';

const { handler } = createChatCompletionHandler({
  chatCompletions: async (bodyParams, extraOptions: IRequestOptions) => {
    // do something
   },
});
```

## 类型定义

### IRequestOptions

```typescript
interface IRequestOptions {
  signal?: AbortSignal | undefined | null;
}
```
