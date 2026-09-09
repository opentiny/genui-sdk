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
  /**
   * 启动时固定的物料元数据；传入后用于生成 system prompt。
   * 不传则按请求 tinygenui.framework 选择内置物料：
   * - Vue → `@opentiny/genui-sdk-materials-vue-opentiny-vue`
   * - Angular → `@opentiny/genui-sdk-materials-angular-opentiny-ng`
   * - 其他 / 未传 framework → 默认 Vue 物料
   */
  materialsMeta?: IMaterialsMeta;
}
```

- **详细信息**

创建一个 Express 应用并启用 CORS，自动注册对话路由（`/chat/completions`）。如果指定端口被占用，会自动尝试下一个端口（最多尝试 `maxAttempts` 次）。启动成功后会在控制台输出服务器地址。物料在启动时通过 `materialsMeta` 固定，请求侧无法切换；未配置时按请求 `framework` 映射内置物料（Vue → OpenTiny Vue，Angular → OpenTiny Angular）。

- **示例**

```typescript
import { startServer } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  maxAttempts: 10,
  materialsMeta,
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
  /**
   * 启动时固定的物料元数据；传入后用于生成 system prompt。
   * 不传则按请求 tinygenui.framework 选择内置物料：
   * - Vue → `@opentiny/genui-sdk-materials-vue-opentiny-vue`
   * - Angular → `@opentiny/genui-sdk-materials-angular-opentiny-ng`
   * - 其他 / 未传 framework → 默认 Vue 物料
   */
  materialsMeta?: IMaterialsMeta;
}
```

- **详细信息**

创建一个对话请求的实例，创建请求处理器，并将处理器注册到指定的路由路径（POST 方法）。物料在装备路由时通过 `materialsMeta` 固定；未配置时按请求 `framework` 映射内置物料（Vue → OpenTiny Vue，Angular → OpenTiny Angular）。

- **示例**

```typescript
import express from 'express';
import { equipChatCompletions } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';

const app = express();

equipChatCompletions(app, {
  route: '/chat/completions',
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  materialsMeta,
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
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
});

const { handler } = createChatCompletionHandler({
  chatCompletions: (params, options) => 
    chatCompletion.chatStream(params, options),
});

const server = http.createServer(handler);
server.listen(3000);
```
