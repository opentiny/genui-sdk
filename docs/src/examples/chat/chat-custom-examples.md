# Chat 组件 - 自定义 Examples

自定义 Examples 提供了组件使用示例，帮助 AI 学习如何正确使用自定义组件。

## 基础用法

```vue
<template>
  <GenuiChat
    :url="url"
    :customConfig="customConfig"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customConfig = {
  customExamples: [
    {
      name: '商品卡片示例',
      description: '展示如何使用 ProductCard 组件',
      schema: {
        componentName: 'ProductCard',
        props: {
          name: 'iPhone 15',
          price: 5999,
          image: 'https://example.com/iphone15.jpg'
        }
      }
    }
  ]
};
</script>
```

## 示例定义格式

```typescript
interface CustomExample {
  name: string;              // 示例名称
  description: string;       // 示例描述
  schema: CardSchema;        // 组件 Schema 示例
}
```

## 使用场景

### 场景 1: 展示组件基础用法

```vue
<script setup>
const customConfig = {
  customExamples: [
    {
      name: 'ProductCard 基础用法',
      description: '展示 ProductCard 组件的基本使用方法',
      schema: {
        componentName: 'ProductCard',
        props: {
          name: '商品名称',
          price: 99.99,
          image: 'https://example.com/product.jpg'
        }
      }
    }
  ]
};
</script>
```

### 场景 2: 展示组件组合用法

```vue
<script setup>
const customConfig = {
  customExamples: [
    {
      name: '商品列表组合',
      description: '展示如何使用 ProductCard 组件创建商品列表',
      schema: {
        componentName: 'Page',
        children: [
          {
            componentName: 'Text',
            props: {
              text: '热门商品',
              style: 'font-size: 24px; font-weight: bold; margin-bottom: 16px;'
            }
          },
          {
            componentName: 'GridStack',
            props: {
              columns: 3,
              gap: 16
            },
            children: [
              {
                componentName: 'GridStackItem',
                children: [
                  {
                    componentName: 'ProductCard',
                    props: {
                      name: '商品1',
                      price: 99,
                      image: 'https://example.com/product1.jpg'
                    }
                  }
                ]
              },
              {
                componentName: 'GridStackItem',
                children: [
                  {
                    componentName: 'ProductCard',
                    props: {
                      name: '商品2',
                      price: 199,
                      image: 'https://example.com/product2.jpg'
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  ]
};
</script>
```

### 场景 3: 展示事件处理

```vue
<script setup>
const customConfig = {
  customExamples: [
    {
      name: '带点击事件的商品卡片',
      description: '展示如何为 ProductCard 添加点击事件',
      schema: {
        componentName: 'ProductCard',
        props: {
          name: '商品名称',
          price: 99.99,
          image: 'https://example.com/product.jpg',
          onClick: {
            type: 'JSFunction',
            value: "function() { this.callAction('openPage', { url: '/product/123' }); }"
          }
        }
      }
    }
  ]
};
</script>
```

## 完整示例

<demo vue="../../../demos/chat/custom-examples.vue" />

## 最佳实践

1. **提供多种示例**：为同一个组件提供多种使用场景的示例，帮助 AI 更好地理解组件的用法
2. **示例要完整**：确保示例 Schema 是完整且可运行的
3. **描述要清晰**：为每个示例提供清晰的描述，说明示例的用途
4. **覆盖常见场景**：提供基础用法、组合用法、事件处理等常见场景的示例

## 注意事项

1. **示例格式**：确保示例的 Schema 格式正确
2. **组件注册**：示例中使用的自定义组件需要在 `SchemaRenderer` 中注册
3. **后端配置**：这些配置会通过 `metadata.tinygenui` 传递给后端，后端需要处理这些配置
4. **示例数量**：提供适量的示例，过多可能会影响 AI 的理解
