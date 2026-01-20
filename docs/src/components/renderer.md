# GenuiRenderer 组件

`GenuiRenderer` 是 GenUI SDK 的核心渲染组件（Renderer），用于将大模型返回的结构化 JSON Schema 渲染为可交互的 UI 界面。

## Props

### content

- **类型**: `string | object`
- **必填**: 是
- **说明**: Schema 内容，可以是字符串或对象。当传入字符串时，组件会尝试解析"部分 JSON"并自动补全，支持流式更新。

```vue
<template>
  <GenuiRenderer :content="schemaContent" />
</template>

<script setup>
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
</script>
```

### generating

- **类型**: `boolean`
- **必填**: 否
- **说明**: 标记当前对话是否正在生成中。用于控制 UI 的加载状态。

```vue
<template>
  <GenuiRenderer :content="content" :generating="isGenerating" />
</template>

<script setup>
const isGenerating = ref(false);
</script>
```

### customComponents

- **类型**: `Record<string, Component>`
- **必填**: 否
- **说明**: 自定义组件映射表，用于扩展可用的组件列表。

```vue
<template>
  <GenuiRenderer :content="content" :customComponents="customComponents" />
</template>

<script setup>
import MyCustomComponent from './MyCustomComponent.vue';

const customComponents = {
  MyCustomComponent: MyCustomComponent,
  // 可以注册多个自定义组件
};
</script>
```

查看 [Renderer 自定义 Components](../examples/renderer/custom-components) 了解详细用法

### customActions

- **类型**: `Record<string, { execute: (params: any, context: any) => void }>`
- **必填**: 否
- **说明**: 自定义动作映射表，用于定义可在组件中调用的动作。

```vue
<template>
  <GenuiRenderer :content="content" :customActions="customActions" />
</template>

<script setup>
const customActions = {
  openPage: {
    execute: (params, context) => {
      window.open(params.url, params.target || '_self');
    },
  },
  showNotification: {
    execute: (params) => {
      // 显示通知
      console.log('通知:', params.message);
    },
  },
};
</script>
```

查看 [Renderer 自定义 Actions](../examples/renderer/custom-actions) 了解详细用法

### requiredCompleteFieldSelectors

- **类型**: `string[]`
- **必填**: 否
- **说明**: 指定哪些字段路径需要完整后才能更新。用于控制流式更新时的缓冲策略。

```vue
<template>
  <GenuiRenderer :content="content" :requiredCompleteFieldSelectors="['props.items', 'children[0].props']" />
</template>
```

查看 [Renderer 配置缓冲字段](../examples/renderer/required-complete-field-selectors) 了解详细用法

### state

- **类型**: `Record<string, any>`
- **必填**: 否
- **说明**: 传递给渲染器的全局状态，可以在组件中通过上下文访问。

```vue
<template>
  <GenuiRenderer :content="content" :state="{ userId: 123, userName: 'John' }" />
</template>
```

查看 [Renderer 传递合并 State](../examples/renderer/state) 了解详细用法

## Slots

### header

- **参数**: `{ schema: CardSchema, isError: boolean, isFinished: boolean }`
- **说明**: 自定义渲染器头部内容

```vue
<template>
  <GenuiRenderer :content="content">
    <template #header="{ schema, isError, isFinished }">
      <div v-if="!isError" class="renderer-header">渲染状态: {{ isFinished ? '已完成' : '生成中...' }}</div>
    </template>
  </GenuiRenderer>
</template>
```

### footer

- **参数**: `{ schema: CardSchema, isError: boolean, isFinished: boolean }`
- **说明**: 自定义渲染器底部内容

```vue
<template>
  <GenuiRenderer :content="content">
    <template #footer="{ schema, isError, isFinished }">
      <div v-if="isFinished" class="renderer-footer">
        <button @click="handleRefresh">刷新</button>
      </div>
    </template>
  </GenuiRenderer>
</template>
```

## Types

### CardSchema

```typescript
type CardSchema = {
  id?: string; // 根节点可选 id
  methods?: Methods; // 方法集合
  state?: Record<string, PropValue>; // 全局状态，表单双向绑定必须此字段
  componentName: string; // 根组件名，通常为 Page
  props?: Record<string, PropValue>; // 根组件属性集合
  componentType?: 'Block' | 'PageStart' | 'PageSection'; // 节点类型,通常省略
  children?: NodeSchema[]; // 根子节点数组
  slot?: string | JSSlot | Record<string, PropValue>; // 根插槽内容
  loop?: Record<string, PropValue>; // 根循环渲染配置
  loopArgs?: string[]; // 根循环参数名列表
  condition?: boolean | Record<string, PropValue>; // 根条件渲染配置
  css?: string; // 全局 CSS 样式字符串
};

type NodeSchema = {
  id?: string; // 节点唯一标识
  componentName: string; // 组件名
  props?: Record<string, PropValue>; // 组件属性集合
  children?: NodeSchema[] | string; // 子节点数组或字符串（递归）
  componentType?: 'Block' | 'PageStart' | 'PageSection'; // 节点类型,通常省略
  slot?: string | JSSlot | Record<string, PropValue>; // 插槽内容
  params?: string[]; // 参数名列表
  loop?: Record<string, PropValue>; // 循环渲染配置
  loopArgs?: string[]; // 循环参数名列表
  condition?: boolean | Record<string, PropValue>; // 条件渲染配置
};

type PropValue =
  | string // 字符串
  | number // 数字
  | boolean // 布尔值
  | null // null
  | JSExpression // JS 表达式包装
  | JSFunction // JS 函数包装
  | JSSlot // 插槽包装
  | PropValue[] // 递归数组
  | Record<string, PropValue>; // 递归对象

type JSExpression = { type: 'JSExpression'; value: string; model?: boolean };
type JSFunction = { type: 'JSFunction'; value: string; params?: string[] };
type JSSlot = { type: 'JSSlot'; value: string | Record<string, any> };
```

### IRendererProps

```typescript
interface IRendererProps {
  content: string | { [prop: string]: any };
  generating?: boolean;
  customComponents?: Record<string, Component>;
  customActions?: Record<
    string,
    {
      execute: (params: any, context: any) => void;
    }
  >;
  requiredCompleteFieldSelectors?: string[];
  id?: string;
  state?: Record<string, any>;
}
```
