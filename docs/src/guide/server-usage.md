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
API_KEY=
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

# 指定物料包名（可省略 /meta 子路径）
npx genui-sdk-server --materials @opentiny/genui-sdk-materials-react-antd

# 指定物料模块/JSON 文件路径
npx genui-sdk-server --materials ./my-materials.mjs

# 指定物料导出名（如 Vue 精简集）
npx genui-sdk-server --materials @opentiny/genui-sdk-materials-vue-opentiny-vue/meta --materials-export miniMaterialsMeta

# 通过设置环境变量启动(git bash)
export API_KEY= BASE_URL=https://your-llm-server.com/api && npx genui-sdk-server
```

#### 方式二：编程方式

```typescript
import { startServer } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  maxAttempts: 10, // 端口冲突时最大尝试次数
  materialsMeta, // 物料须与前端一致；非内置默认物料时必须显式传入，见「物料配置（materialsMeta）」
});
```

#### 方式三：集成到现有 Express 应用

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
  materialsMeta, // 不传则按 framework 取内置默认物料（Vue → OpenTiny Vue，Angular → OpenTiny Angular）；其他物料须显式传入，见「物料配置（materialsMeta）」
});

app.listen(3000);
```

### 物料配置（materialsMeta）

Server 会把物料元数据（`materialsMeta`）注入 system prompt，让大模型按物料包中真实存在的组件名生成 schema。因此**服务端使用的物料必须与前端 `GenuiConfigProvider` 注入的物料一致**，否则大模型生成的组件名前端无法渲染（例如服务端用 Vue 物料、前端用 React 物料时，会生成 `TinyButton`，而 React 侧只有 Ant Design 的 `Button`）。

`startServer` / `equipChatCompletions` 的 `materialsMeta` 不传时，服务端按请求 `metadata.tinygenui.framework` 选择内置默认物料：

| framework | 服务端内置默认物料 |
| --- | --- |
| `Vue` | `@opentiny/genui-sdk-materials-vue-opentiny-vue/meta` |
| `Angular` | `@opentiny/genui-sdk-materials-angular-opentiny-ng/meta` |
| 其他 / 未指定 | 回落到 Vue 默认物料 |

**只要前端物料与上表的内置默认不一致，就必须在服务端显式传入对应的 `materialsMeta`**，包括但不限于：

| 前端物料 | 编程方式需传入 | CLI 等价写法 |
| --- | --- | --- |
| React Ant Design `@opentiny/genui-sdk-materials-react-antd` | `@opentiny/genui-sdk-materials-react-antd/meta` | `-m @opentiny/genui-sdk-materials-react-antd` |
| Vue Element Plus `@opentiny/genui-sdk-materials-vue-element-plus` | `@opentiny/genui-sdk-materials-vue-element-plus/meta` | `-m @opentiny/genui-sdk-materials-vue-element-plus` |
| Vue 精简集 `miniMaterials` | `miniMaterialsMeta` | `-m @opentiny/genui-sdk-materials-vue-opentiny-vue/meta --materials-export miniMaterialsMeta` |
| 自定义物料 | 自行提供的 `IMaterialsMeta` | `-m ./my-materials.mjs`（模块或 `.json` 文件路径） |

以 React 前端为例：

```typescript
import { startServer } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-react-antd/meta';

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  materialsMeta, // 与前端注入的 React 物料保持一致
});
```

以 Vue Element Plus 前端为例：

```typescript
import { startServer } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';

startServer({
  port: 3100,
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  materialsMeta, // 与前端注入的 Element Plus 物料保持一致
});
```

> CLI（`npx genui-sdk-server`）通过 `-m, --materials` 支持按物料包名或模块/JSON 文件路径加载物料，并可用 `--materials-export` 指定导出名；不传时仍使用内置默认物料。因此无论用哪种启动方式，都能让服务端物料与前端保持一致：
>
> ```bash
> # 按包名（自动优先命中 /meta 子路径）
> npx genui-sdk-server -m @opentiny/genui-sdk-materials-react-antd
>
> # 按文件路径（模块或 .json）
> npx genui-sdk-server -m ./my-materials.mjs
>
> # 指定导出名（如 Vue 精简集）
> npx genui-sdk-server -m @opentiny/genui-sdk-materials-vue-opentiny-vue/meta --materials-export miniMaterialsMeta
> ```
>
> 包名从命令执行时的当前工作目录解析，因此需要在运行 CLI 的项目中安装对应物料包；只给包名时会优先尝试 `<包名>/meta` 子路径，失败后回退到包入口。

## 请求发起端使用

### 聊天补全接口

**端点**: `POST /chat/completions`

**请求格式**（OpenAI 兼容）：

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
    "tinygenui": "{}" // 详情参考 tinygenui 配置
  }
}
```

**响应格式**（Server-Sent Events）：

```text
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: [DONE]
```

### tinygenui 配置

通过 `metadata.tinygenui` 字段传递 GenUI 配置以增强大模型生成效果（JSON 字符串）：

```json
{
  "framework": "Vue", // 或 "Angular" / "React"
  "strategy": "append", // "append" | "prepend" | "override"
  "customComponents": [], // 自定义组件 schema 数组
  "customExamples": [], // 自定义组件使用示例
  "customSnippets": [], // 自定义组件片段 schema 数组
  "customActions": [] // 自定义动作定义数组
}
```

- `framework`: 指定前端框架（`Vue`、`Angular` 或 `React`），用于生成对应的渲染器配置，并决定不传 `materialsMeta` 时使用哪套内置默认物料（详见上文「物料配置（materialsMeta）」）
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
