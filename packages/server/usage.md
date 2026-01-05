# GenUI SDK Vue 使用文档

GenUI SDK 对话服务，提供 OpenAI 兼容的 HTTP 接口，支持流式响应和多种 AI 服务提供商。

## 功能特性

- ✅ OpenAI 兼容的 `/chat/completions` API 接口
- ✅ 支持流式响应（Server-Sent Events）
- ✅ 集成 GenUI SDK，自动注入 GenUI 提示词
- ✅ 支持多种聊天服务实现：
  - `FetchChatService`: 使用原生 fetch 调用 OpenAI 兼容接口
  - `OpenaiChatService`: 使用 OpenAI SDK
  - `AiSdkChatService`: 使用 Vercel AI SDK，支持 OpenAI、Anthropic、DeepSeek 等
- ✅ 自动端口冲突处理
- ✅ 支持工具调用（Function Calling）
- ✅ CORS 支持

## 快速开始

### 安装

全局安装

```bash
npm install -g @opentiny/genui-sdk-server
```

安装到项目

```bash
npm install @opentiny/genui-sdk-server
```

### 环境配置

创建 `.env` 文件：

```env
BASE_URL=https://api.openai.com/v1
API_KEY=your-api-key-here
PORT=3100
```

### 启动服务

#### 方式一：使用 CLI 命令

```bash
# 使用默认配置
npx genui-sdk-server

# 指定环境变量文件 简写为-e
npx genui-sdk-server --envFile .env.production

# 指定端口 简写为-p
npx genui-sdk-server --port 3000
```

#### 方式二：编程方式

```typescript
import { startServer } from '@opentiny/genui-sdk-server';

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  maxAttempts: 10, // 端口冲突时最大尝试次数
});
```

#### 方式三：集成到现有 Express 应用

```typescript
import express from 'express';
import { equipChatCompletions } from '@opentiny/genui-sdk-server';

const app = express();
app.use(cors());

equipChatCompletions(app, {
  route: '/chat/completions',
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
});

app.listen(3000);
```

## API 使用

### 聊天补全接口

**端点**: `POST /chat/completions`

**请求格式**（OpenAI 兼容）：

```json
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
    "tinygenui": "{}" // 详情参考 tinygenui 配置
  }
}
```

**响应格式**（Server-Sent Events）：

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: [DONE]
```

### tinygenui 配置

通过 `metadata.tinygenui` 字段传递 GenUI 配置（JSON 字符串）：

```json
{
  "framework": "Vue", // 或 "Angular"
  "strategy": "append", // "append" | "prepend" | "override"
  "customComponents": [], // 自定义组件 schema 数组
  "customExamples": [], // 自定义组件使用示例
  "customSnippets": [], // 自定义组件片段 schema 数组
  "customActions": [] // 自定义动作定义数组
}
```

- `framework`: 指定前端框架（Vue 或 Angular），用于生成对应的渲染器配置
- `strategy`: 提示词合并策略
  - `append`: 追加到现有 system message（默认）
  - `prepend`: 前置到现有 system message
  - `override`: 覆盖现有 system message
- `customComponents`: 自定义组件 schema 数组，用于扩展可用的组件列表
- `customExamples`: 自定义组件使用示例，用于指导 AI 生成正确的组件用法
- `customSnippets`: 自定义组件片段 schema 数组，用于提供常用的组件组合模式
- `customActions`: 自定义动作定义数组，用于定义可在组件中调用的动作（如提交表单、打开新页面等）

#### 自定义组件配置示例

**customComponents** 配置示例：

```js
const customComponents = [
  {
    name: '选择用户组件',
    description: '选择用户组件，用于选择用户，支持模糊搜索',
    component: 'TinyUser',
    schema: {
      properties: [
        {
          property: 'name',
          description: '搜索用户名称，支持模糊搜索',
          type: 'string',
          required: true,
        },
      ],
    },
  },
];
```

**customExamples** 配置示例：

```js
const customExamples = [
  {
    name: '选择用户示例',
    schema: {
      componentName: 'Page',
      children: [
        {
          componentName: 'h3',
          props: {},
          children: '输入用户名搜索工号并选择用户',
        },
        {
          componentName: 'TinyUser',
          props: {
            name: '张三',
          },
        },
      ],
    },
  },
];
```

**customSnippets** 配置示例：

```js
// 表单组合示例
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
          label: '姓名',
          prop: 'name',
          required: true,
        },
        children: [
          {
            componentName: 'TinyInput',
            props: {
              placeholder: '请输入姓名',
            },
          },
        ],
      },
      {
        componentName: 'TinyFormItem',
        props: {
          label: '邮箱',
          prop: 'email',
        },
        children: [
          {
            componentName: 'TinyInput',
            props: {
              placeholder: '请输入邮箱',
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
              children: '提交',
            },
          },
        ],
      },
    ],
  },
];
```

**customActions** 配置示例：

```js
const customActions = [
  {
    name: 'continueChat',
    description: '继续对话，用于表单的提交按钮等',
    params: [
      {
        name: 'message',
        type: 'string',
        description: '对话消息，可以是按钮文本等，也可以是其他内容',
      },
    ],
  },
  {
    name: 'openPage',
    description: '打开新页面，用于页面跳转',
    params: [
      {
        name: 'url',
        type: 'string',
        description: '目标页面URL或路径',
      },
      {
        name: 'target',
        type: 'string',
        description: '打开方式，可选值：_self（当前窗口）、_blank（新窗口）',
      },
    ],
  },
];
```

**完整配置示例**：

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
