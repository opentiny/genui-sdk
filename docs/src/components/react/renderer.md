# GenuiRenderer 组件

`GenuiRenderer` 是 GenUI SDK 的核心渲染组件（Renderer），用于将大模型返回的结构化 JSON Schema 渲染为可交互的 UI 界面。

仅使用 Renderer 时可从 `@opentiny/genui-sdk-react/renderer` 按需引入，见 [安装与配置 - 按需引入](../../guide/react/install#按需引入)。

::: warning 物料配置
`GenuiRenderer` 本身不包含 UI 物料，需配合 `GenuiConfigProvider` 的 `materials` 使用，详见 [GenuiConfigProvider](./config-provider) 与 [安装与配置](../../guide/react/install#物料配置)。
:::

## Props

### content

- **类型**: `string | object`
- **必填**: 是
- **说明**: Schema 内容，可以是字符串或对象。当传入字符串时，组件会尝试解析"部分 JSON"并自动补全，支持流式更新。

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const schemaContent = {
  componentName: 'Page',
  children: [
    {
      componentName: 'Text',
      props: {
        text: 'Hello World',
      },
    },
  ],
};

export function Example() {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={schemaContent} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

### isJsonComplete

- **类型**: `boolean`
- **必填**: 否
- **说明**: 仅当 content 类型为 json 对象时生效，标记当前 json 是否完整，用于辅助缓冲判断是否值完整。已有完整 schema 对象、不需要流式修补时可传 `true`。

```tsx
import { useState } from 'react';
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

export function Example() {
  const [content] = useState({
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          text: 'Hello World',
          style: 'color:',
        },
      },
    ],
  });
  const [isJsonComplete] = useState(false);

  return <GenuiRenderer content={content} isJsonComplete={isJsonComplete} />;
}
```

### generating

- **类型**: `boolean`
- **必填**: 否
- **说明**: 标记当前对话是否正在生成中。用于控制 UI 的加载状态。

```tsx
import { useState } from 'react';
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

export function Example() {
  const [isGenerating] = useState(true);
  const content = {
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: { text: 'Hello World' },
      },
    ],
  };

  return <GenuiRenderer content={content} generating={isGenerating} />;
}
```

### customComponents

- **类型**: `Record<string, ComponentType>`
- **必填**: 否
- **说明**: 自定义组件映射表，用于扩展可用的组件列表。会与 `GenuiConfigProvider` 注入的物料合并，同名时以 `customComponents` 为准。

```tsx
import { GenuiRenderer } from '@opentiny/genui-sdk-react';
import { MyCustomComponent } from './MyCustomComponent';

const schemaContent = {
  componentName: 'Page',
  children: [
    {
      componentName: 'MyCustomComponent',
      props: { foo: 'bar' },
    },
  ],
};

const customComponents = {
  MyCustomComponent,
};

export function Example() {
  return <GenuiRenderer content={schemaContent} customComponents={customComponents} isJsonComplete />;
}
```

### customActions

- **类型**: `Record<string, { execute: (params: any, context: any) => void }>`
- **必填**: 否
- **说明**: 自定义动作映射表，用于定义可在组件中调用的动作。

```tsx
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

const schemaContent = {
  componentName: 'Page',
  children: [
    {
      componentName: 'Text',
      props: {
        text: 'Hello World',
        onClick: {
          type: 'JSFunction',
          value: "function() { this.callAction('showNotification', { message: '用户点击了 HelloWorld' })}",
        },
      },
    },
  ],
};

const customActions = {
  openPage: {
    execute: (params) => {
      window.open(params.url, params.target || '_self');
    },
  },
  showNotification: {
    execute: (params) => {
      console.log('通知:', params.message);
    },
  },
};

export function Example() {
  return <GenuiRenderer content={schemaContent} customActions={customActions} isJsonComplete />;
}
```

查看 [Renderer 自定义 Actions](../../examples/react/renderer/custom-actions) 了解详细用法

### requiredCompleteFieldSelectors

- **类型**: `string[]`
- **必填**: 否
- **说明**: 指定哪些字段路径需要完整后才能更新。用于控制流式更新时的缓冲策略。

```tsx
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

const requiredCompleteFieldSelectors = ['[componentName=Text] > props > onClick'];

export function Example({ content }: { content: string }) {
  return (
    <GenuiRenderer content={content} requiredCompleteFieldSelectors={requiredCompleteFieldSelectors} />
  );
}
```

## Methods

通过 `ref` 可以访问 `GenuiRenderer` 暴露的方法，用于在渲染器外部读写状态。

### setState

- **类型**: `(state?: Record<string, unknown>) => void`
- **说明**: 设置渲染器的全局状态，与已有状态浅层合并，未传入的字段会保留。直接透传给底层渲染器，不做缓存：流式生成过程中 schema 每次更新都会用 schema 里的 state 重置状态，需要保留的状态请在 schema 更新后重新调用 `setState`。

React 表单组件应使用 `value` 或 `checked` 读取状态，并通过 `onChange` 类型的 `JSFunction` 更新状态；React 渲染器不支持使用 `model: true` 自动生成变更事件。

```tsx
import { useEffect, useRef } from 'react';
import { GenuiConfigProvider, GenuiRenderer, type IRendererExpose } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const savedState = {
  userId: 123,
  userName: 'John',
};

export function Example({ content }: { content: string }) {
  const rendererRef = useRef<IRendererExpose | null>(null);

  // 从历史记录中恢复状态：组件挂载完成后注入
  useEffect(() => {
    rendererRef.current?.setState(savedState);
  }, []);

  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer ref={rendererRef} content={content} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

查看 [Renderer 传递合并 State](../../examples/react/renderer/state) 了解详细用法

### getState

- **类型**: `() => Record<string, unknown>`
- **说明**: 获取渲染器当前的全局状态（即渲染器 context 中的 `state`）。

### rendererInstance

- **类型**: `SchemaRendererHandle | null`
- **说明**: 底层渲染器实例，复杂场景可以直接调用其 API（如 `getContext`、`setContext`）。

## Types

### IRendererProps

```typescript
interface IRendererProps {
  content: string | Record<string, unknown>;
  isJsonComplete?: boolean;
  generating?: boolean;
  customComponents?: Record<string, ComponentType>;
  customActions?: Record<string, ICustomAction>;
  requiredCompleteFieldSelectors?: string[];
}
```

### IRendererExpose

```typescript
interface IRendererExpose {
  rendererInstance: SchemaRendererHandle | null; // 底层渲染器实例，复杂场景可以使用其 API
  getState: () => Record<string, unknown>; // 获取全局状态
  setState: (state?: Record<string, unknown>) => void; // 设置全局状态
}
```

### ICustomAction

```typescript
interface ICustomAction {
  execute: (params: unknown, context: Record<string, unknown>) => unknown;
  name?: string;
  description?: string;
  parameters?: unknown;
  return?: unknown;
  async?: boolean;
}
```
