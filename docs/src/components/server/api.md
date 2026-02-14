# API 参考

`@opentiny/genui-sdk-server` 提供了用于构建大模型对话 HTTP 服务的组件 API。

## startServer()

启动一个 Express HTTP 服务器，提供大模型对话服务。

- **类型**

```typescript
function startServer(options: IStartServerOptions): void

interface IStartServerOptions {
  /** API 基础 URL */
  baseURL: string;
  /** API 密钥 */
  apiKey: string;
  /** 服务器启动端口，默认 3100 */
  port?: number;
  /** 端口被占用时的最大尝试次数，默认 10 */
  maxAttempts?: number;
}
```

- **详细信息**

创建一个 Express 应用并启用 CORS，自动注册对话路由（`/chat/completions`）。如果指定端口被占用，会自动尝试下一个端口（最多尝试 `maxAttempts` 次）。启动成功后会在控制台输出服务器地址。

- **示例**

```typescript
import { startServer } from '@opentiny/genui-sdk-server';

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  maxAttempts: 10,
});
```

## equipChatCompletions()

为 Express 应用装备对话功能，注册对话路由处理器。

- **类型**

```typescript
function equipChatCompletions(
  app: Express,
  options: IEquipChatCompletionsOptions
): void

interface IEquipChatCompletionsOptions {
  /** 路由路径，例如 '/chat/completions' */
  route: string;
  /** API 密钥 */
  apiKey: string;
  /** API 基础 URL */
  baseURL: string;
}
```

- **详细信息**

创建一个对话请求的实例，创建请求处理器，并将处理器注册到指定的路由路径（POST 方法）。

- **示例**

```typescript
import express from 'express';
import { equipChatCompletions } from '@opentiny/genui-sdk-server';

const app = express();

equipChatCompletions(app, {
  route: '/chat/completions',
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
});

app.listen(3000);
```

## createChatCompletionHandler()

创建一个对话请求处理器，用于处理 HTTP 请求并返回流式响应。

- **类型**

```typescript
function createChatCompletionHandler(
  config: IChatCompletionHandlerConfig
): { handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> }

interface IChatCompletionHandlerConfig {
  chatCompletions: (
    params: ChatCompletionCreateParamsBase,
    options?: IRequestOptions
  ) => Promise<Response>;
}

interface IRequestOptions {
  signal?: AbortSignal | undefined | null;
}
```

- **详细信息**

解析请求体（JSON 格式），调用对话接口获取流式响应，处理流式响应并转换为 SSE（Server-Sent Events）格式，处理客户端断开连接（自动中止请求），统一的错误处理和格式化。

如果响应不是流式格式，会抛出错误。所有错误都会被捕获并格式化为统一的错误响应。如果响应头已发送，错误会以 SSE 格式追加到流中。

- **示例**

```typescript
import { createChatCompletionHandler } from '@opentiny/genui-sdk-server';
import { FetchChatCompletions } from '@opentiny/genui-sdk-chat-completions';
import http from 'http';

const chatCompletion = new FetchChatCompletions({
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
});

const { handler } = createChatCompletionHandler({
  chatCompletions: (params, options) => 
    chatCompletion.chatStream(params, options),
});

const server = http.createServer(handler);
server.listen(3000);
```
