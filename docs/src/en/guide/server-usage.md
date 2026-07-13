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

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  maxAttempts: 10, // Max retries when port is in use
});
```

#### Option 3: Integrate into an existing Express app

```typescript
import express from 'express';
import { equipChatCompletions } from '@opentiny/genui-sdk-server';
import cors from 'cors';

const app = express();
app.use(cors());

equipChatCompletions(app, {
  route: '/chat/completions',
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
});

app.listen(3000);
```

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
  "framework": "Vue", // or "Angular"
  "strategy": "append", // "append" | "prepend" | "override"
  "customComponents": [], // Custom component schema array
  "customExamples": [], // Custom component usage examples
  "customSnippets": [], // Custom component snippet schema array
  "customActions": [] // Custom action definition array
}
```

- `framework`: Target frontend framework (Vue or Angular) for renderer configuration
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
