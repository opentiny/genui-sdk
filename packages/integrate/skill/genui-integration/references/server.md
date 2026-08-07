# Server 集成指南

本指南涵盖 集成 `@opentiny/genui-sdk-server` 用于后端服务 that proxy LLM calls with OpenAI-compatible HTTP interfaces.

## 概述

GenUI SDK Server 提供:
- OpenAI 兼容的 HTTP API
- 流式响应支持（服务器发送事件）
- Mul提示le AI service provider support
- 易于集成到现有 Express 应用

## 安装

### 全局安装

```bash
# npm
npm install -g @opentiny/genui-sdk-server

# pnpm
pnpm add -g @opentiny/genui-sdk-server

# yarn
yarn global add @opentiny/genui-sdk-server
```

### 项目安装

```bash
# npm
npm install @opentiny/genui-sdk-server

# pnpm
pnpm add @opentiny/genui-sdk-server

# yarn
yarn add @opentiny/genui-sdk-server
```

## 配置

### 环境变量

在项目根目录创建 `.env` 文件:

```env
BASE_URL=https://api.openai.com/v1
API_KEY=your-api-key-here
PORT=3100
```

- `BASE_URL`: 你的 LLM 提供商的基础 URL (OpenAI, DeepSeek, etc.)
- `API_KEY`: 你的认证 API 密钥
- `PORT`: 服务器的端口号 (默认: 3100)

## 使用模式

### 模式 1: CLI 命令 (快速开始)

启动 GenUI 服务器的最快方式:

```bash
# 使用 npx (推荐)
npx genui-sdk-server

# 使用自定义环境文件
npx genui-sdk-server --envFile .env.production

# 使用自定义端口
npx genui-sdk-server --port 3000

# 使用环境变量 (Git Bash)
export API_KEY=your-key BASE_URL=https://your-llm-server.com/api && npx genui-sdk-server
```

### 模式 2: 编程方式启动

从你的 TypeScript/JavaScript 代码启动服务器:

```typescript
import { startServer } from '@opentiny/genui-sdk-server';

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.API_KEY || '',
  maxAttempts: 10, // 端口被占用时的最大尝试次数
});
```

这在你想要以下功能时很有用:
- 将服务器启动集成到应用生命周期中
- 动态配置服务器参数
- 添加自定义初始化逻辑

### 模式 3: Express 集成

将 GenUI SDK 集成到现有 Express 应用:

```typescript
import express from 'express';
import { equipChatCompletions } from '@opentiny/genui-sdk-server';
import cors from 'cors';

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (isProduction) return false;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// 添加 GenUI 聊天补全端点
equipChatCompletions(app, {
  route: '/chat/completions',
  apiKey: process.env.API_KEY || '',
  baseURL: 'https://api.openai.com/v1',
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

这种模式在你以下情况时很理想:
- 已经有 Express 应用
- 想要向现有路由添加 GenUI 功能
- 需要自定义中间件或认证
- 想要将 GenUI 与其他 API 端点结合

## API 参考

### 聊天补全端点

**端点**: `POST /chat/completions`

**请求格式** (OpenAI 兼容):

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
    "tinygenui": "{}"
  }
}
```

**响应格式** (服务器发送事件):

```text
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: [DONE]
```

## tinygenui 配置

The `metadata.tinygenui` field (JSON string) 启用 GenUI 特定功能以增强 LLM 生成质量.

### 配置 结构

```json
{
  "framework": "Vue",
  "strategy": "append",
  "customComponents": [],
  "customExamples": [],
  "customSnippets": [],
  "customActions": []
}
```

### 配置 选项

**framework**: 渲染器配置的前端框架
- `"Vue"` - 生成 Vue 兼容的 schema
- `"Angular"` - 生成 Angular 兼容的 schema

**strategy**: 提示词合并策略
- `"append"` - 追加到现有系统消息 (默认)
- `"prepend"` - 前置到现有系统消息
- `"override"` - 覆盖现有系统消息

**customComponents**: 自定义组件 schema 数组
```javascript
const customComponents = [
  {
    name: 'User Selector',
    description: '支持模糊搜索的选择用户组件',
    component: 'TinyUser',
    schema: {
      properties: [
        {
          property: 'name',
          description: '模糊搜索的用户名',
          type: 'string',
          required: true,
        },
      ],
    },
  },
];
```

**customExamples**: 组件使用示例数组
```javascript
const customExamples = [
  {
    name: '用户选择示例',
    schema: {
      componentName: 'Page',
      children: [
        {
          componentName: 'h3',
          props: {},
          children: '按名称搜索并选择用户',
        },
        {
          componentName: 'TinyUser',
          props: {
            name: 'John Doe',
          },
        },
      ],
    },
  },
];
```

**customSnippets**: 组件组合模式数组
```javascript
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
              placeholder: 'Enter name',
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

**customActions**: 自定义动作定义数组
```javascript
const customActions = [
  {
    name: 'openPage',
    description: '打开新页面进行导航',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '目标页面 URL 或路径',
        },
        target: {
          type: 'string',
          description: '打开方式: _self (当前窗口) or _blank (新窗口)',
        },
      },
      required: ['url', 'target'],
    },
  },
];
```

**安全提示（openPage）**：服务端 `customActions` metadata 只描述 action 能力，**不能**替代前端校验。LLM 传入的 URL 不可信，前端 `execute` 必须校验协议（仅 `http`/`https`）与 origin（同源或白名单），跨域或 `_blank` 导航使用 `noopener,noreferrer`，拒绝未授权目标。实现参考 `references/angular.md` 中的 `openAllowedPage`。建议在 `description` 中明确可导航范围，降低模型生成越权 URL 的概率。

### 完整请求示例

```javascript
const requestParams = {
  'model': 'gpt-4',
  'messages': [
    {
      'role': 'system',
      'content': 'You are a helpful assistant.',
    },
    {
      'role': 'user',
      'content': 'Create a user registration form',
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

## 安全注意事项

### API 密钥保护

永远不要在客户端代码中暴露你的 API 密钥. 始终使用服务器作为代理:

```typescript
// ✅ 好 - 服务器处理 API 密钥
const response = await fetch('https://your-server.com/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    messages: [...],
    model: 'deepseek-v3.2',
    stream: true,
  }),
});

// ❌ 坏 - 客户端暴露 API 密钥
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${apiKey}`, // 已暴露!
  },
  // ...
});
```

### CORS 配置

与 Express 集成时，使用显式 origin 白名单配置 CORS。开发环境自动放行 `localhost` / `127.0.0.1` 任意端口的 `http` origin；生产环境须在 `ALLOWED_ORIGINS` 中配置正式前端域名，勿使用无选项 `cors()`。

```typescript
import cors from 'cors';

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (isProduction) return false;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
```

### 速率限制

考虑添加速率限制以防止滥用:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 限制每个 IP 在每个时间窗口内 100 个请求
});

app.use('/chat/completions', limiter);
```

## 部署

### 环境变量

使用环境变量进行生产部署:

```bash
# .env.production
BASE_URL=https://api.openai.com/v1
API_KEY=your-production-api-key
ALLOWED_ORIGINS=https://your-domain.com
PORT=3100
NODE_ENV=production
```

### Docker 部署

示例 Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3100

CMD ["npx", "genui-sdk-server"]
```

### 云部署

服务器可以部署到任何 Node.js 托管平台:
- Heroku
- Railway
- Render
- AWS ECS
- Google Cloud Run
- Azure App Service

## 故障排除

### 端口已被占用

**问题**: 服务器启动失败，提示"端口 3100 已被占用"

**解决方案**: 
1. 使用不同的端口: `npx genui-sdk-server --port 3001`
2. Or increase `maxAttempts` to try mul提示le ports

### API 密钥不工作

**问题**: 请求因认证错误而失败

**解决方案**:
1. 验证 `.env` 文件中的 API 密钥是否正确
2. 检查 API 密钥是否有适当的权限
3. 确保 BASE_URL 与你的 API 提供商匹配

### CORS 错误

**问题**: 浏览器因 CORS 错误阻止请求

**解决方案**:
1. 添加 CORS 中间件并配置显式 allowed origins（见上文 CORS 配置示例）
2. 生产环境确认 `ALLOWED_ORIGINS` 包含前端域名，且浏览器请求的 `Origin` 在白名单中
3. 开发环境 `localhost` / `127.0.0.1` 任意端口自动放行，勿使用无选项 `cors()`

### 流式不工作

**问题**: 客户端未收到流式响应

**解决方案**:
1. 确保客户端在请求中设置 `stream: true`
2. 检查客户端是否可以处理 SSE 格式
3. 验证代理/负载均衡器支持流式传输

## 下一步

- 设置 [Vue 前端](./vue.md) 来连接到你的服务器
- 设置 [Angular 前端](./angular.md) 来连接到你的服务器
- 配置 [自定义组件](../examples/renderer/custom-components.md) 用于 specialized UI
- 实现 [自定义动作](../examples/renderer/custom-actions.md) 用于交互功能
