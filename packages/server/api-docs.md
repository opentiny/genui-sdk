## 核心模块说明

### Genui 类

`Genui` 类是聊天补全的核心，负责：

- 接收 OpenAI 格式的请求参数
- 通过 `requestTransform` 注入 GenUI 提示词
- 调用底层的 `ChatService` 获取流式响应

```typescript
import { Genui } from '@huawei/tiny-genui-server';
import { FetchChatService } from '@huawei/tiny-genui-server';

const chatService = new FetchChatService({
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
});

const genui = new Genui({ chatService });

const stream = await genui.chatCompletions({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
});
```

### ChatService 实现

#### FetchChatService

使用原生 `fetch` 调用 OpenAI 兼容接口，返回 `Response` 对象：

```typescript
import { FetchChatService } from '@huawei/tiny-genui-server';

const service = new FetchChatService({
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
});
```

#### OpenaiChatService

使用 OpenAI 官方 SDK：

```typescript
import { OpenaiChatService } from '@huawei/tiny-genui-server';

const service = new OpenaiChatService({
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
});
```

#### AiSdkChatService

使用 Vercel AI SDK，支持多种提供商：

```typescript
import { AiSdkChatService } from '@huawei/tiny-genui-server';

const service = new AiSdkChatService({
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
import { createChatCompletionHandler } from '@huawei/tiny-genui-server';

const { handler } = createChatCompletionHandler({
  chatCompletions: async (params, options) => {
    // 返回 Response 或 AsyncIterable
  },
});
```

## 类型定义

### IOpenaiCompatibleRequestOptions

```typescript
interface IOpenaiCompatibleRequestOptions {
  maxRetries?: number;
  timeout?: number;
  signal?: AbortSignal | undefined | null;
}
```

### IOpenaiCompatibleChunk

```typescript
type IOpenaiCompatibleChunk = ChatCompletionChunk;
```
