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

# Specify materials by package name (the /meta subpath is tried first)
npx genui-sdk-server -m @opentiny/genui-sdk-materials-react-antd

# Specify materials by file path (module or .json)
npx genui-sdk-server -m ./my-materials.mjs

# Pick a named export, e.g. the Vue mini set
npx genui-sdk-server -m @opentiny/genui-sdk-materials-vue-opentiny-vue/meta --materials-export miniMaterialsMeta
```

> Without `--materials`, the CLI uses the built-in default materials (Vue → OpenTiny Vue, Angular → OpenTiny Angular). Pass `--materials` whenever the frontend replaces its materials (React, Vue Element Plus, the mini set, custom materials, etc.).
>
> `--materials <source>` accepts either a package name (e.g. `@opentiny/genui-sdk-materials-react-antd`, resolved from the current working directory; a bare package name first tries `<package>/meta`) or a path to a module/JSON file that exports the materials metadata. `--materials-export <name>` selects the named export to read (default `materialsMeta`).

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

Need the same "path or package name" resolution outside the CLI? Use `loadMaterialsMeta`, the helper the CLI is built on:

```typescript
import { startServer, loadMaterialsMeta } from '@opentiny/genui-sdk-server';

// Package name (tries <package>/meta first), file path, or .json — same as --materials
const materialsMeta = await loadMaterialsMeta('@opentiny/genui-sdk-materials-react-antd');

startServer({ port: 3100, baseURL: 'https://api.openai.com/v1', apiKey: 'your-api-key', materialsMeta });
```

## Documentation

* [Server Usage Guide](https://docs.opentiny.design/genui-sdk/guide/server-usage)

## API

* [Server API](https://docs.opentiny.design/genui-sdk/components/server/api)
