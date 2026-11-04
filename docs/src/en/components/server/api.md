# API Reference

`@opentiny/genui-sdk-server` provides component APIs for building large language model chat HTTP services.

## startServer()

Starts an Express HTTP server that provides chat completion services.

- **Type**

```typescript
function startServer(options: IStartServerOptions): void

interface IStartServerOptions {
  /** API base URL */
  baseURL: string;
  /** API key */
  apiKey: string;
  /** Server port, default 3100 */
  port?: number;
  /** Max attempts when port is in use, default 10 */
  maxAttempts?: number;
  /**
   * Materials metadata fixed at startup for system prompt generation.
   * If omitted, built-in default materials are selected by request tinygenui.framework:
   * - Vue → `@opentiny/genui-sdk-materials-vue-opentiny-vue`
   * - Angular → `@opentiny/genui-sdk-materials-angular-opentiny-ng`
   * - Other / missing framework → Vue materials by default
   * Whenever the frontend materials differ from these defaults (React materials, Vue Element Plus,
   * the mini set, custom materials, etc.), pass the matching materialsMeta explicitly.
   */
  materialsMeta?: IMaterialsMeta;
}
```

- **Details**

Creates an Express app with CORS enabled and registers the chat route (`/chat/completions`). If the specified port is in use, it automatically tries the next port (up to `maxAttempts` times). On success, the server address is printed to the console. Materials are fixed at startup via `materialsMeta` and cannot be switched per request. When omitted, they follow the request `framework` mapping to built-in defaults (Vue → OpenTiny Vue, Angular → OpenTiny Angular); other frameworks fall back to the Vue default. **Whenever the frontend materials differ from these defaults (React materials, Vue Element Plus, the mini set, custom materials, etc.), the matching `materialsMeta` must be passed explicitly**, otherwise the generated component names will not match the frontend materials. The CLI can only use the built-in defaults.

- **Example**

```typescript
import { startServer } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  maxAttempts: 10,
  materialsMeta, // Vue built-in default materials; switch to the matching meta for React / Element Plus / custom materials
});
```

## equipChatCompletions()

Equips an Express app with chat completion functionality by registering the route handler.

- **Type**

```typescript
function equipChatCompletions(
  app: Express,
  options: IEquipChatCompletionsOptions
): void

interface IEquipChatCompletionsOptions {
  /** Route path, e.g. '/chat/completions' */
  route: string;
  /** API key */
  apiKey: string;
  /** API base URL */
  baseURL: string;
  /**
   * Materials metadata fixed when equipping the route for system prompt generation.
   * If omitted, built-in materials are selected by request tinygenui.framework:
   * - Vue → `@opentiny/genui-sdk-materials-vue-opentiny-vue`
   * - Angular → `@opentiny/genui-sdk-materials-angular-opentiny-ng`
   * - React → no built-in materials; pass `@opentiny/genui-sdk-materials-react-antd/meta` explicitly
   * - Other / missing framework → Vue materials by default
   */
  materialsMeta?: IMaterialsMeta;
}
```

- **Details**

Creates a chat completion request instance, builds a request handler, and registers it on the specified route (POST). Materials are fixed via `materialsMeta` when equipping the route. When omitted, they follow the request `framework` mapping to built-in defaults (Vue → OpenTiny Vue, Angular → OpenTiny Angular). **Whenever the frontend materials differ from these defaults (React materials, Vue Element Plus, the mini set, custom materials, etc.), the matching `materialsMeta` must be passed explicitly.**

- **Example**

```typescript
import express from 'express';
import { equipChatCompletions } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const app = express();

equipChatCompletions(app, {
  route: '/chat/completions',
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  materialsMeta, // Vue built-in default materials; switch to the matching meta for React / Element Plus / custom materials
});

app.listen(3000);
```

## createChatCompletionHandler()

Creates a chat completion request handler that processes HTTP requests and returns streaming responses.

- **Type**

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

- **Details**

Parses the request body (JSON), calls the chat completion API for a streaming response, converts the stream to SSE (Server-Sent Events), handles client disconnects (automatically aborting the request), and provides unified error handling and formatting.

If the response is not streaming, an error is thrown. All errors are caught and formatted into a unified error response. If response headers have already been sent, errors are appended to the stream in SSE format.

- **Example**

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
