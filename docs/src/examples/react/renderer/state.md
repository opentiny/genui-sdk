# Renderer 组件 - 传递合并 State

通过组件实例方法 `setState`，你可以向渲染器注入状态，这些状态会合并到全局状态中，可以在组件中通过上下文访问。

## 给组件注入 State

通过 `setState` 向渲染器注入状态是浅层合并。`setState` 仅针对当前运行时做注入，不做存储，因此在流式场景下，schema 里的 state 更新会清空之前 `setState` 设置的状态，因此流式场景下需控制 `setState` 的时机。

### 应用场景

`setState` 主要用于**历史记录回写**场景，当需要回显历史对话中的状态时，可以通过 `setState` 传递之前保存的状态数据，让渲染器恢复到之前的状态。

### 基础用法

```tsx
import { useEffect, useRef } from 'react';
import { GenuiConfigProvider, GenuiRenderer, type IRendererExpose } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const generating = false;
const content = {};

// 从历史记录中恢复的状态
const savedState = {
  formData: {
    name: 'John Doe',
    age: 30,
  },
};

export default function Example() {
  const rendererRef = useRef<IRendererExpose | null>(null);

  // 挂载完成后注入状态，此时渲染器实例已就绪
  useEffect(() => {
    rendererRef.current?.setState(savedState);
  }, []);

  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer ref={rendererRef} content={content} generating={generating} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

### 在 Action 中访问 State

在自定义 Action 中，可以通过 `context.state` 访问 state：

```tsx
const customActions = {
  getState: {
    execute: (params: unknown, context: Record<string, unknown>) => {
      const state = context.state;
      alert(`全局状态: ${JSON.stringify(state)}`);
    },
  },
};
```

#### 完整示例：

<demo react="../../../../demos/react/renderer/state.tsx" />

## 注意事项

1. **合并更新**：`setState` 与已有状态浅层合并，未传入的字段会保留
2. **流式更新**：schema 每次更新都会用 schema 里的 state 重置状态，需要保留的状态要在更新后重新调用 `setState`
3. **历史回显**：主要用于历史记录回写场景，恢复之前保存的状态
4. **数据格式**：State 应该是可序列化的数据，避免存储函数、DOM 元素等
