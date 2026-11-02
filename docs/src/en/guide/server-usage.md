# GenUI SDK Server Usage

The GenUI SDK chat server provides OpenAI-compatible HTTP endpoints with streaming responses and support for multiple AI providers.

## Start the server

### Installation

Global installation:

:::: tabs
== npm
```bash
npm install -g @opentiny/genui-sdk-server
```
== pnpm
```bash
pnpm add -g @opentiny/genui-sdk-server
```
== yarn
```bash
yarn global add @opentiny/genui-sdk-server
```
::::

Project installation:

:::: tabs
== npm
```bash
npm install @opentiny/genui-sdk-server
```
== pnpm
```bash
pnpm add @opentiny/genui-sdk-server
```
== yarn
```bash
yarn add @opentiny/genui-sdk-server
```
::::

### Environment configuration

Create a `.env` file:

```env
BASE_URL=https://api.openai.com/v1
API_KEY=
PORT=3100
```

### Startup options

#### Option 1: CLI command

```bash
# Use default configuration
npx genui-sdk-server

# Specify env file (shorthand: -e)
npx genui-sdk-server --envFile .env.production

# Specify port (shorthand: -p)
npx genui-sdk-server --port 3000

# Start with environment variables (git bash)
export API_KEY= BASE_URL=https://your-llm-server.com/api && npx genui-sdk-server
```

#### Option 2: Programmatic startup

```typescript
import { startServer } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  maxAttempts: 10, // Max retries when port is in use
  materialsMeta, // Must match the frontend materials; required whenever they differ from the built-in defaults. See "Materials configuration (materialsMeta)".
});
```

#### Option 3: Integrate into an existing Express app

```typescript
import express from 'express';
import { equipChatCompletions } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import cors from 'cors';

const app = express();
app.use(cors());

equipChatCompletions(app, {
  route: '/chat/completions',
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  materialsMeta, // If omitted, built-in defaults are selected by request framework (Vue → OpenTiny Vue, Angular → OpenTiny Angular). Any other materials must be passed explicitly; see "Materials configuration (materialsMeta)".
});

app.listen(3000);
```

### Materials configuration (materialsMeta)

The server injects materials metadata (`materialsMeta`) into the system prompt so the LLM generates schemas using component names that actually exist in the materials package. Therefore **the materials used by the server must match those injected by the frontend `GenuiConfigProvider`**; otherwise the generated component names cannot be rendered by the frontend (for example, with Vue materials on the server and React materials on the frontend, the LLM generates `TinyButton`, while React only has Ant Design's `Button`).

When `materialsMeta` is omitted from `startServer` / `equipChatCompletions`, the server selects built-in default materials based on the request `metadata.tinygenui.framework`:

| framework | Server built-in default materials |
| --- | --- |
| `Vue` | `@opentiny/genui-sdk-materials-vue-opentiny-vue/meta` |
| `Angular` | `@opentiny/genui-sdk-materials-angular-opentiny-ng/meta` |
| Other / unspecified | Falls back to the Vue default materials |

**Whenever the frontend materials differ from the built-in defaults above, the matching `materialsMeta` must be passed explicitly on the server**, including but not limited to:

| Frontend materials | Server must be passed |
| --- | --- |
| React Ant Design `@opentiny/genui-sdk-materials-react-antd` | `@opentiny/genui-sdk-materials-react-antd/meta` |
| Vue Element Plus `@opentiny/genui-sdk-materials-vue-element-plus` | `@opentiny/genui-sdk-materials-vue-element-plus/meta` |
| Vue mini set `miniMaterials` | `miniMaterialsMeta` |
| Custom materials | Your own `IMaterialsMeta` |

With a React frontend:

```typescript
import { startServer } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-react-antd/meta';

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  materialsMeta, // Keep consistent with the React materials injected on the frontend
});
```

With a Vue Element Plus frontend:

```typescript
import { startServer } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  materialsMeta, // Keep consistent with the Element Plus materials injected on the frontend
});
```

> The CLI (`npx genui-sdk-server`) exposes no materials option and **can only use the built-in default materials**. As soon as the frontend replaces its materials (React, Element Plus, the mini set, custom materials, etc.), you must switch to Option 2 (programmatic startup) or Option 3 (Express integration) and pass `materialsMeta` explicitly.

## Client usage

### Chat completions endpoint

**Endpoint**: `POST /chat/completions`

**Request format** (OpenAI-compatible):

```jsonc
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "stream": true,
  "temperature": 0.7,
  "metadata": {
    "tinygenui": "{}" // See tinygenui configuration below
  }
}
```

**Response format** (Server-Sent Events):

```text
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: [DONE]
```

### tinygenui configuration

Pass GenUI configuration via `metadata.tinygenui` to improve LLM generation (JSON string):

```json
{
  "framework": "Vue", // or "Angular" / "React"
  "strategy": "append", // "append" | "prepend" | "override"
  "customComponents": [], // Custom component schema array
  "customExamples": [], // Custom component usage examples
  "customSnippets": [], // Custom component snippet schema array
  "customActions": [] // Custom action definition array
}
```

- `framework`: Target frontend framework (`Vue`, `Angular` or `React`) for renderer configuration; it also determines which built-in default materials are used when `materialsMeta` is omitted (see [Materials configuration (materialsMeta)](#materials-configuration-materialsmeta))
- `strategy`: Prompt merge strategy
  - `append`: Append to the existing system message (default)
  - `prepend`: Prepend to the existing system message
  - `override`: Replace the existing system message
- `customComponents`: Custom component schema array to extend the available component list
- `customExamples`: Custom component usage examples to guide the LLM in generating correct component usage
- `customSnippets`: Custom component snippet schema array for common component composition patterns
- `customActions`: Custom action definition array for actions callable from components (e.g. submit form, open a new page)

#### Custom component configuration examples

**customComponents** example:

```js
const customComponents = [
  {
    name: 'User Selector',
    description: 'Select a user with fuzzy search by name',
    component: 'TinyUser',
    schema: {
      properties: [
        {
          property: 'name',
          description: 'User name to search; supports fuzzy search',
          type: 'string',
          required: true,
        },
      ],
    },
  },
];
```

**customExamples** example:

```js
const customExamples = [
  {
    name: 'User selection example',
    schema: {
      componentName: 'Page',
      children: [
        {
          componentName: 'h3',
          props: {},
          children: 'Enter a username to search and select a user',
        },
        {
          componentName: 'TinyUser',
          props: {
            name: 'Zhang San',
          },
        },
      ],
    },
  },
];
```

**customSnippets** example:

```js
// Form composition example
const customSnippets = [
  {
    componentName: 'TinyForm',
    props: {
      labelPosition: 'top',
      labelWidth: '120px',
    },
    children: [
      {
        componentName: 'TinyFormItem',
        props: {
          label: 'Name',
          prop: 'name',
          required: true,
        },
        children: [
          {
            componentName: 'TinyInput',
            props: {
              placeholder: 'Enter your name',
            },
          },
        ],
      },
      {
        componentName: 'TinyFormItem',
        props: {
          label: 'Email',
          prop: 'email',
        },
        children: [
          {
            componentName: 'TinyInput',
            props: {
              placeholder: 'Enter your email',
            },
          },
        ],
      },
      {
        componentName: 'TinyFormItem',
        props: {
          label: '',
        },
        children: [
          {
            componentName: 'TinyButton',
            props: {
              type: 'primary',
              children: 'Submit',
            },
          },
        ],
      },
    ],
  },
];
```

**customActions** example:

```js
const customActions = [
  {
    name: 'openPage',
    description: 'Open a new page for navigation',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Target page URL or path',
        },
        target: {
          type: 'string',
          description: 'Open mode: _self (current window) or _blank (new window)',
        },
      },
      required: ['url', 'target'],
    },
  },
];
```

**Full configuration example**:

```js
const requestParams = {
  'model': 'gpt-4',
  'messages': [
    {
      'role': 'system',
      'content': 'You are a helpful assistant.',
    },
    {
      'role': 'user',
      'content': 'Hello!',
    },
  ],
  'stream': true,
  'temperature': 0.7,
  'metadata': {
    'tinygenui': JSON.stringify({
      framework: 'Vue',
      strategy: 'append',
      customComponents,
      customExamples,
      customSnippets,
      customActions,
    }),
  },
};
```
