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

### state

- **类型**: `Record<string, any>`
- **必填**: 否
- **说明**: 传递给渲染器的全局状态，可以在组件中通过上下文访问。

```tsx
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

const schemaContent = {
  componentName: 'Page',
  state: {
    userId: null,
    userName: '',
  },
  children: [
    {
      componentName: 'Text',
      props: {
        text: {
          type: 'JSExpression',
          value: 'this.state.userName',
        },
      },
    },
  ],
};

const state = {
  userId: 123,
  userName: 'John',
};

export function Example() {
  return <GenuiRenderer content={schemaContent} state={state} isJsonComplete />;
}
```

### id

- **类型**: `string`
- **必填**: 否
- **说明**: 卡片标识，会写入渲染器上下文的 `cardId`，便于在自定义动作中区分实例。
