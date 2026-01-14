# 支持自定义渲染器

GenUI SDK 提供了灵活的渲染器架构，允许你创建自定义的渲染器实现，适配不同的框架或特殊需求。

## 渲染器架构

GenUI SDK 的渲染器基于以下核心概念：

1. **Schema 解析**：将 JSON Schema 解析为组件树
2. **组件映射**：将 Schema 中的组件名映射到实际的组件实现
3. **上下文管理**：管理组件间的状态和通信
4. **事件处理**：处理用户交互和动作调用

## 创建自定义渲染器

### 基础渲染器接口

```typescript
interface IRenderer {
  render(schema: CardSchema, context: RendererContext): void;
  update(schema: CardSchema, context: RendererContext): void;
  destroy(): void;
}
```

### 实现自定义渲染器

```typescript
// custom-renderer.ts
import type { CardSchema, RendererContext } from '@opentiny/genui-sdk-core';

export class CustomRenderer {
  private container: HTMLElement;
  private componentMap: Map<string, any> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  // 注册组件
  registerComponent(name: string, component: any) {
    this.componentMap.set(name, component);
  }

  // 渲染 Schema
  render(schema: CardSchema, context: RendererContext) {
    this.container.innerHTML = '';
    const element = this.createElement(schema, context);
    if (element) {
      this.container.appendChild(element);
    }
  }

  // 创建元素
  private createElement(schema: CardSchema, context: RendererContext): HTMLElement | null {
    const { componentName, props, children } = schema;

    // 检查是否有自定义组件
    const Component = this.componentMap.get(componentName);
    if (Component) {
      return this.renderCustomComponent(Component, props, children, context);
    }

    // 默认使用原生 HTML 元素
    const element = document.createElement(componentName || 'div');
    
    // 设置属性
    if (props) {
      Object.entries(props).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'string') {
          element.setAttribute('style', value);
        } else if (key.startsWith('on')) {
          // 事件处理
          const eventName = key.slice(2).toLowerCase();
          element.addEventListener(eventName, value as EventListener);
        } else {
          element.setAttribute(key, String(value));
        }
      });
    }

    // 渲染子元素
    if (children) {
      if (Array.isArray(children)) {
        children.forEach(child => {
          const childElement = this.createElement(child, context);
          if (childElement) {
            element.appendChild(childElement);
          }
        });
      } else if (typeof children === 'string') {
        element.textContent = children;
      }
    }

    return element;
  }

  // 渲染自定义组件
  private renderCustomComponent(
    Component: any,
    props: any,
    children: any,
    context: RendererContext
  ): HTMLElement | null {
    // 根据你的框架实现自定义组件渲染
    // 这里是一个简化的示例
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-component', Component.name);
    
    // 调用组件的渲染方法
    if (typeof Component.render === 'function') {
      Component.render(wrapper, props, children, context);
    }
    
    return wrapper;
  }

  // 更新 Schema
  update(schema: CardSchema, context: RendererContext) {
    this.render(schema, context);
  }

  // 销毁
  destroy() {
    this.container.innerHTML = '';
    this.componentMap.clear();
  }
}
```

## React 渲染器示例

```typescript
// react-renderer.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import type { CardSchema, RendererContext } from '@opentiny/genui-sdk-core';

export class ReactRenderer {
  private root: any;
  private componentMap: Map<string, React.ComponentType<any>> = new Map();

  constructor(container: HTMLElement) {
    this.root = createRoot(container);
  }

  registerComponent(name: string, component: React.ComponentType<any>) {
    this.componentMap.set(name, component);
  }

  render(schema: CardSchema, context: RendererContext) {
    const element = this.createElement(schema, context);
    this.root.render(element);
  }

  private createElement(schema: CardSchema, context: RendererContext): React.ReactElement {
    const { componentName, props, children } = schema;

    const Component = this.componentMap.get(componentName || 'div') || componentName || 'div';

    const childElements = Array.isArray(children)
      ? children.map(child => this.createElement(child, context))
      : children;

    return React.createElement(Component, props, childElements);
  }

  destroy() {
    this.root.unmount();
  }
}
```

## Vue 3 渲染器示例

```typescript
// vue-renderer.ts
import { createApp, h } from 'vue';
import type { CardSchema, RendererContext } from '@opentiny/genui-sdk-core';

export class VueRenderer {
  private app: any;
  private componentMap: Map<string, any> = new Map();

  constructor(container: HTMLElement) {
    this.app = createApp({
      render: () => null
    });
    this.app.mount(container);
  }

  registerComponent(name: string, component: any) {
    this.componentMap.set(name, component);
  }

  render(schema: CardSchema, context: RendererContext) {
    const vnode = this.createElement(schema, context);
    this.app._instance = null;
    this.app._container = container;
    this.app.render(vnode, container);
  }

  private createElement(schema: CardSchema, context: RendererContext): any {
    const { componentName, props, children } = schema;

    const component = this.componentMap.get(componentName) || componentName || 'div';

    const childNodes = Array.isArray(children)
      ? children.map(child => this.createElement(child, context))
      : children;

    return h(component, props, childNodes);
  }

  destroy() {
    this.app.unmount();
  }
}
```

## 使用自定义渲染器

```typescript
// app.ts
import { CustomRenderer } from './custom-renderer';
import { SchemaParser } from '@opentiny/genui-sdk-core';

const container = document.getElementById('app');
const renderer = new CustomRenderer(container!);

// 注册自定义组件
renderer.registerComponent('MyButton', {
  render: (container: HTMLElement, props: any) => {
    const button = document.createElement('button');
    button.textContent = props.children || 'Click me';
    button.onclick = props.onClick;
    container.appendChild(button);
  }
});

// 解析并渲染 Schema
const schema = {
  componentName: 'Page',
  children: [
    {
      componentName: 'MyButton',
      props: {
        children: 'Hello World',
        onClick: () => alert('Clicked!')
      }
    }
  ]
};

renderer.render(schema, {});
```

## 集成到 GenUI SDK

### 创建渲染器适配器

```typescript
// renderer-adapter.ts
import type { IRenderer } from '@opentiny/genui-sdk-core';

export function createRendererAdapter(customRenderer: any): IRenderer {
  return {
    render(schema: CardSchema, context: RendererContext) {
      customRenderer.render(schema, context);
    },
    update(schema: CardSchema, context: RendererContext) {
      customRenderer.update(schema, context);
    },
    destroy() {
      customRenderer.destroy();
    }
  };
}
```

### 在 SchemaRenderer 中使用

```typescript
import { SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { createRendererAdapter } from './renderer-adapter';
import { CustomRenderer } from './custom-renderer';

const container = document.getElementById('app');
const customRenderer = new CustomRenderer(container!);
const adapter = createRendererAdapter(customRenderer);

// 使用适配器
// SchemaRenderer 内部会使用这个适配器
```

## 最佳实践

1. **组件注册**：提供清晰的组件注册 API
2. **生命周期管理**：正确处理组件的创建、更新和销毁
3. **事件处理**：统一事件处理机制
4. **性能优化**：实现增量更新和虚拟 DOM（如适用）
5. **类型安全**：提供完整的 TypeScript 类型定义

## 注意事项

1. **Schema 格式**：确保自定义渲染器支持标准的 Schema 格式
2. **组件映射**：提供灵活的组件映射机制
3. **上下文传递**：确保上下文正确传递给所有组件
4. **错误处理**：实现完善的错误处理机制
5. **兼容性**：确保与 GenUI SDK 的其他部分兼容
