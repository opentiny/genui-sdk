# @opentiny/genui-sdk-server


A server for the OpenTiny GenUI SDK to enhance LLM return structure stream content. Provides OpenAI-compatible chat completion API with GenUI schema streaming support.

* **Streaming:** Returns structured JSON Schema stream for progressive UI rendering.
* **OpenAI Compatible:** Drop-in replacement for OpenAI chat completions API.
* **Easy Integration:** Programmatic API or CLI to start the server.

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

> The CLI uses the built-in default materials (Vue → OpenTiny Vue, Angular → OpenTiny Angular) and exposes no materials option. If the frontend replaces its materials (React, Vue Element Plus, the mini set, custom materials, etc.), start the server programmatically or via Express and pass `materialsMeta` explicitly.

### Programmatic

```typescript
import { startServer, equipChatCompletions } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import express from 'express';

// materialsMeta must match the materials injected by the frontend GenuiConfigProvider.
// Built-in defaults: Vue -> OpenTiny Vue, Angular -> OpenTiny Angular.
// Any other materials (React, Vue Element Plus, the mini set, custom) must be passed explicitly.
startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  materialsMeta,
});

// Option 2: Custom Express app
const app = express();
equipChatCompletions(app, {
  route: '/api/chat',
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  materialsMeta,
});
app.listen(3100);
```

## Documentation

* [Server Usage Guide](https://docs.opentiny.design/genui-sdk/guide/server-usage)

## API

* [Server API](https://docs.opentiny.design/genui-sdk/components/server/api)
