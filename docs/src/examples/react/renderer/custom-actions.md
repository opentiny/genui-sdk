# Renderer 组件 - 自定义 Actions

自定义 Actions 可以自行编写执行代码从而实现复杂的交互逻辑，需配合提示词让 LLM 输出对应 schemaJson 调用 Actions

## 给组件传递自定义 Actions

通过 `customActions` prop 向 `GenuiRenderer` 组件传递自定义动作。每个自定义 Action 需要包含以下属性：

- `name`: 动作名称
- `description`: 动作描述
- `parameters`: 参数 JSON Schema 描述
- `return`: (可选)返回值 JSON Schema 描述，无返回值时可省略
- `async`: (可选)是否为异步 Action，默认为 `false`；为 `true` 时 `execute` 需返回 Promise
- `execute`: 执行函数，接收 `params` 和 `context` 两个参数

### execute 函数参数说明

- `params`: 调用动作时传入的参数对象
- `context`: 渲染器的上下文信息，包含渲染器的状态和方法，可以通过 `context.state` 获取全局双向绑定状态

当 `async: true` 时，`execute` 返回 Promise，`this.callAction` 也会返回 Promise，可在 Schema 的 `methods` 中链式处理：

```json
{
  "methods": {
    "handleSubmit": {
      "type": "JSFunction",
      "value": "function() { this.callAction('validateForm').then(function(result) { console.log(result); }); }"
    }
  }
}
```

### 示例 1：打开新页面

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const generating = false;
const content = {};

const customActions = {
  openPage: {
    name: 'openPage',
    description: '打开新页面',
    execute: (params: { url: string; target?: string }) => {
      const { url, target = '_self' } = params;
      window.open(url, target);
    },
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要打开的页面地址',
        },
        target: {
          type: 'string',
          description: '打开方式，可选值：_self（当前窗口）、_blank（新窗口）',
        },
      },
      required: ['url', 'target'],
    },
  },
};

export default function Example() {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={content} generating={generating} customActions={customActions} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

#### 完整示例：

<demo react="../../../../demos/react/renderer/custom-actions-open-page.tsx" />

### 示例 2：显示表单实时绑定的内容

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const generating = false;
const content = {};

const customActions = {
  showNotification: {
    name: 'showNotification',
    description: '显示通知，弹出表单中实时绑定的内容',
    execute: (params: { title: string }, context: Record<string, unknown>) => {
      const message = JSON.stringify(context.state);
      alert(`${params.title}：${message}`);
    },
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '通知标题',
        },
      },
      required: ['title'],
    },
  },
};

export default function Example() {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={content} generating={generating} customActions={customActions} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

#### 完整示例：

<demo react="../../../../demos/react/renderer/custom-actions-form.tsx" />

## 把自定义组件信息传给 Server

渲染器支持自定义组件后，同步修改 LLM 生成对话服务，把自定义的 Actions 信息发送给大模型。

```ts
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: userInput }],
    model: 'deepseek-v3.2',
    stream: true,
    metadata: {
      tinygenui: JSON.stringify({
        framework: 'React',
        customActions: [
          {
            name: 'openPage',
            description: '打开新页面',
            parameters: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: '要打开的页面地址',
                },
                target: {
                  type: 'string',
                  description: '打开方式，可选值：_self（当前窗口）、_blank（新窗口）',
                },
              },
              required: ['url', 'target'],
            },
          },
        ],
      }),
    },
  }),
});
```
