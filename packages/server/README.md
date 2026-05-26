# @opentiny/genui-sdk-server


A server for the OpenTiny GenUI SDK to enhance LLM return structure stream content. Provides OpenAI-compatible chat completion API with GenUI schema streaming support.

* **Streaming:** Returns structured JSON Schema stream for progressive UI rendering.
* **OpenAI Compatible:** Drop-in replacement for OpenAI chat completions API.
* **Easy Integration:** Programmatic API or CLI to start the server.


## Monorepo 开发（genui-sdk 仓库）

在仓库根目录：

```bash
pnpm i
# 启动 server 开发（watch test/start.ts）
pnpm dev:server
# 或
pnpm --filter @opentiny/genui-sdk-server dev

# 构建产物到 output/dist
pnpm build:server
# 或
pnpm --filter @opentiny/genui-sdk-server build
```

公共 API 由 `output/dist/index.js` 导出：`startServer`、`equipChatCompletions` 等（见 `src/index.ts`）。

## Usage

### CLI

```bash
# Create .env file with required variables
echo "BASE_URL=https://api.openai.com/v1" > .env
echo "API_KEY=your-api-key" >> .env

# Start server (default port 3100)
npx genui-sdk-server

# Custom port
npx genui-sdk-server -p 3000

# Custom env file
npx genui-sdk-server -e .env.production
```

### Programmatic

```typescript
import { startServer, equipChatCompletions } from '@opentiny/genui-sdk-server';
import express from 'express';

// Option 1: Use startServer (includes default route /chat/completions)
startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
});

// Option 2: Custom Express app
const app = express();
equipChatCompletions(app, {
  route: '/api/chat',
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
});
app.listen(3100);
```


## Documentation

* [Server Usage Guide](https://docs.opentiny.design/genui-sdk/guide/server-usage)

## API

* [Server API](https://docs.opentiny.design/genui-sdk/components/server/api)



