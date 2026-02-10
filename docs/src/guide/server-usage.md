# GenUI SDK Server 使用文档

GenUI SDK 对话服务，提供 OpenAI 兼容的 HTTP 接口，支持流式响应和多种 AI 服务提供商。

## 启动服务

### 安装

全局安装

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

安装到项目

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

### 环境配置

创建 `.env` 文件：

```env
BASE_URL=https://api.openai.com/v1
API_KEY=your-api-key-here
PORT=3100
```

### 启动方式

#### 方式一：使用 CLI 命令

```bash
# 使用默认配置
npx genui-sdk-server

# 指定环境变量文件 简写为-e
npx genui-sdk-server --envFile .env.production

# 指定端口 简写为-p
npx genui-sdk-server --port 3000

# 通过设置环境变量启动(git bash)
export API_KEY=********* BASE_URL=https://your-llm-server.com/api && npx genui-sdk-server
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
import cors from 'cors';

const app = express();
app.use(cors());

equipChatCompletions(app, {
  route: '/chat/completions',
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
});

app.listen(3000);
```

## 请求发起端使用

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

通过 `metadata.tinygenui` 字段传递 GenUI 配置以增强大模型生成效果（JSON 字符串）：

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
- `customExamples`: 自定义组件使用示例，用于指导 LLM 生成正确的组件用法
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
    name: 'openPage',
    description: '打开新页面，用于页面跳转',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '目标页面URL或路径',
        },
        target: {
          type: 'string',
          description: '打开方式，可选值：_self（当前窗口）、_blank（新窗口）',
        },
      },
      required: ['url', 'target'],
    },
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
