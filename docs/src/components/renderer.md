# SchemaRenderer 组件

`SchemaRenderer` 是 GenUI SDK 的核心渲染组件，用于将大模型返回的结构化 JSON Schema 渲染为可交互的 UI 界面。

## Props

### content

- **类型**: `string | object`
- **必填**: 是
- **说明**: Schema 内容，可以是字符串或对象。当传入字符串时，组件会尝试解析"部分 JSON"并自动补全，支持流式更新。

```vue
<template>
  <SchemaRenderer :content="schemaContent" />
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
- **必填**: 是
- **说明**: 标记当前对话是否正在生成中。用于控制 UI 的加载状态。

```vue
<template>
  <SchemaRenderer :content="content" :generating="isGenerating" />
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
  <SchemaRenderer :content="content" :customComponents="customComponents" />
</template>

<script setup>
import MyCustomComponent from './MyCustomComponent.vue';

const customComponents = {
  MyCustomComponent: MyCustomComponent,
  // 可以注册多个自定义组件
};
</script>
```

### customActions

- **类型**: `Record<string, { execute: (params: any, context: any) => void }>`
- **必填**: 否
- **说明**: 自定义动作映射表，用于定义可在组件中调用的动作。

```vue
<template>
  <SchemaRenderer :content="content" :customActions="customActions" />
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

### requiredCompleteFieldSelectors

- **类型**: `string[]`
- **必填**: 否
- **说明**: 指定哪些字段路径需要完整后才能更新。用于控制流式更新时的缓冲策略。

```vue
<template>
  <SchemaRenderer :content="content" :requiredCompleteFieldSelectors="['props.items', 'children[0].props']" />
</template>
```

### id

- **类型**: `string`
- **必填**: 否
- **说明**: 组件实例的唯一标识符，用于多实例场景。

```vue
<template>
  <SchemaRenderer :content="content" id="renderer-1" />
</template>
```

### state

- **类型**: `Record<string, any>`
- **必填**: 否
- **说明**: 传递给渲染器的全局状态，可以在组件中通过上下文访问。

```vue
<template>
  <SchemaRenderer :content="content" :state="{ userId: 123, userName: 'John' }" />
</template>
```

## Slots

### header

- **参数**: `{ schema: CardSchema, isError: boolean, isFinished: boolean }`
- **说明**: 自定义渲染器头部内容

```vue
<template>
  <SchemaRenderer :content="content">
    <template #header="{ schema, isError, isFinished }">
      <div v-if="!isError" class="renderer-header">渲染状态: {{ isFinished ? '已完成' : '生成中...' }}</div>
    </template>
  </SchemaRenderer>
</template>
```

### footer

- **参数**: `{ schema: CardSchema, isError: boolean, isFinished: boolean }`
- **说明**: 自定义渲染器底部内容

```vue
<template>
  <SchemaRenderer :content="content">
    <template #footer="{ schema, isError, isFinished }">
      <div v-if="isFinished" class="renderer-footer">
        <button @click="handleRefresh">刷新</button>
      </div>
    </template>
  </SchemaRenderer>
</template>
```

## Types

### CardSchema

```typescript
interface CardSchema {
  componentName: string;
  props?: Record<string, any>;
  children?: CardSchema[];
  [key: string]: any;
}
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
