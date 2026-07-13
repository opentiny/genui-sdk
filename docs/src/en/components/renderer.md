# GenuiRenderer Component

`GenuiRenderer` is the core rendering component (Renderer) of GenUI SDK. It renders structured JSON Schema returned by large language models into interactive UI.

When using only Renderer, you can import it on demand from `@opentiny/genui-sdk-vue/renderer`. See [Quick Start - Subpath Imports](../guide/quick-start#subpath-imports).

## Props

### content

- **Type**: `string | object`
- **Required**: Yes
- **Description**: Schema content as a string or object. When a string is passed, the component attempts to parse "partial JSON" and auto-complete it, supporting streaming updates.

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

### isJsonComplete

- **Type**: `boolean`
- **Required**: No
- **Description**: Applies only when `content` is a JSON object. Marks whether the current JSON is complete, helping the buffer logic determine whether values are complete.

```vue
<template>
  <GenuiRenderer :content="content" :isJsonComplete="isJsonComplete" />
</template>

<script setup>
const content = ref({
  componentName: 'Page',
  css: '.main-content { color:'
})
const isJsonComplete = ref(false);
</script>
```

### generating

- **Type**: `boolean`
- **Required**: No
- **Description**: Indicates whether the current conversation is still generating. Used to control UI loading state.

```vue
<template>
  <GenuiRenderer :content="content" :generating="isGenerating" />
</template>

<script setup>
const isGenerating = ref(false);
</script>
```

### customComponents

- **Type**: `Record<string, Component>`
- **Required**: No
- **Description**: Custom component map for extending the available component list.

```vue
<template>
  <GenuiRenderer :content="content" :customComponents="customComponents" />
</template>

<script setup>
import MyCustomComponent from './MyCustomComponent.vue';

const customComponents = {
  MyCustomComponent: MyCustomComponent,
  // Register multiple custom components
};
</script>
```

See [Renderer - Custom Components](../examples/renderer/custom-components) for detailed usage.

### customActions

- **Type**: `Record<string, { execute: (params: any, context: any) => void }>`
- **Required**: No
- **Description**: Custom action map defining actions that can be invoked from components.

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
      console.log('Notification:', params.message);
    },
  },
};
</script>
```

See [Renderer - Custom Actions](../examples/renderer/custom-actions) for detailed usage.

### requiredCompleteFieldSelectors

- **Type**: `string[]`
- **Required**: No
- **Description**: Specifies which field paths must be complete before updates are applied. Used to control buffering strategy during streaming updates.

```vue
<template>
  <!-- All componentName values must be complete; the name prop on TinyTabItem must be complete -->
  <GenuiRenderer :content="content" :requiredCompleteFieldSelectors="['componentName', '[componentName=TinyTabItem] > props > name']" />
</template>
```

See [Renderer - Buffer Field Configuration](../examples/renderer/required-complete-field-selectors) for detailed usage.

### state

- **Type**: `Record<string, any>`
- **Required**: No
- **Description**: Global state passed to the renderer, accessible in components via context.

```vue
<template>
  <GenuiRenderer :content="content" :state="{ userId: 123, userName: 'John' }" />
</template>
```

See [Renderer - Passing and Merging State](../examples/renderer/state) for detailed usage.

## Slots

### header

- **Parameters**: `{ schema: CardSchema, isError: boolean, isFinished: boolean }`
- **Description**: Custom renderer header content

```vue
<template>
  <GenuiRenderer :content="content">
    <template #header="{ schema, isError, isFinished }">
      <div v-if="!isError" class="renderer-header">Render status: {{ isFinished ? 'Completed' : 'Generating...' }}</div>
    </template>
  </GenuiRenderer>
</template>
```

### footer

- **Parameters**: `{ schema: CardSchema, isError: boolean, isFinished: boolean }`
- **Description**: Custom renderer footer content

```vue
<template>
  <GenuiRenderer :content="content">
    <template #footer="{ schema, isError, isFinished }">
      <div v-if="isFinished" class="renderer-footer">
        <button @click="handleRefresh">Refresh</button>
      </div>
    </template>
  </GenuiRenderer>
</template>
```

## Types

### CardSchema

```typescript
type CardSchema = {
  id?: string; // Optional root node id
  methods?: Methods; // Method collection
  state?: Record<string, PropValue>; // Global state; required for two-way form binding
  componentName: string; // Root component name, usually Page
  props?: Record<string, PropValue>; // Root component props
  componentType?: 'Block' | 'PageStart' | 'PageSection'; // Node type, usually omitted
  children?: NodeSchema[]; // Root child nodes
  slot?: string | JSSlot | Record<string, PropValue>; // Root slot content
  loop?: Record<string, PropValue>; // Root loop render config
  loopArgs?: string[]; // Root loop argument names
  condition?: boolean | Record<string, PropValue>; // Root conditional render config
  css?: string; // Global CSS string
};

type NodeSchema = {
  id?: string; // Unique node id
  componentName: string; // Component name
  props?: Record<string, PropValue>; // Component props
  children?: NodeSchema[] | string; // Child nodes or string (recursive)
  componentType?: 'Block' | 'PageStart' | 'PageSection'; // Node type, usually omitted
  slot?: string | JSSlot | Record<string, PropValue>; // Slot content
  params?: string[]; // Parameter names
  loop?: Record<string, PropValue>; // Loop render config
  loopArgs?: string[]; // Loop argument names
  condition?: boolean | Record<string, PropValue>; // Conditional render config
};

type PropValue =
  | string // String
  | number // Number
  | boolean // Boolean
  | null // null
  | JSExpression // JS expression wrapper
  | JSFunction // JS function wrapper
  | JSSlot // Slot wrapper
  | PropValue[] // Recursive array
  | Record<string, PropValue>; // Recursive object

type JSExpression = { type: 'JSExpression'; value: string; model?: boolean };
type JSFunction = { type: 'JSFunction'; value: string; params?: string[] };
type JSSlot = { type: 'JSSlot'; value: string | Record<string, any> };
```

### IRendererProps

```typescript
interface IRendererProps {
  content: string | { [prop: string]: any };
  isJsonComplete?: boolean;
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
