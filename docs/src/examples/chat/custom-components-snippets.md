# Chat 组件 - 自定义 Components 及 Snippets

在 `GenuiChat` 组件中，你可以通过 `customConfig` 传递自定义组件和片段，扩展 AI 可以使用的组件库。

## 自定义 Components

自定义 Components 定义了 AI 可以使用的组件 Schema，包括组件的名称、属性、子元素等。

### 基础用法

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
  customComponentsSchema: [
    {
      name: 'ProductCard',
      displayName: '商品卡片',
      description: '用于展示商品信息的卡片组件',
      props: [
        {
          name: 'name',
          type: 'string',
          description: '商品名称',
          required: true
        },
        {
          name: 'price',
          type: 'number',
          description: '商品价格',
          required: true
        },
        {
          name: 'image',
          type: 'string',
          description: '商品图片URL'
        }
      ],
      children: true  // 是否支持子元素
    }
  ]
};
</script>
```

### 组件定义格式

```typescript
interface CustomComponent {
  name: string;              // 组件名称
  displayName?: string;      // 显示名称
  description: string;       // 组件描述
  props: Array<{            // 属性定义
    name: string;
    type: string;
    description: string;
    required?: boolean;
    default?: any;
  }>;
  children?: boolean;        // 是否支持子元素
}
```

### 完整示例

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
  customComponentsSchema: [
    {
      name: 'ProductCard',
      displayName: '商品卡片',
      description: '用于展示商品信息的卡片组件',
      props: [
        {
          name: 'name',
          type: 'string',
          description: '商品名称',
          required: true
        },
        {
          name: 'price',
          type: 'number',
          description: '商品价格',
          required: true
        },
        {
          name: 'image',
          type: 'string',
          description: '商品图片URL'
        },
        {
          name: 'onClick',
          type: 'function',
          description: '点击事件处理函数'
        }
      ],
      children: false
    },
    {
      name: 'UserProfile',
      displayName: '用户资料',
      description: '显示用户基本信息和头像',
      props: [
        {
          name: 'name',
          type: 'string',
          description: '用户名称',
          required: true
        },
        {
          name: 'email',
          type: 'string',
          description: '用户邮箱'
        },
        {
          name: 'avatar',
          type: 'string',
          description: '头像URL'
        }
      ],
      children: false
    }
  ]
};
</script>
```

## 自定义 Snippets

自定义 Snippets 提供了常用的组件组合模式，帮助 AI 快速生成常见的 UI 结构。

### 基础用法

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
  customSnippets: [
    {
      name: '表单组合',
      description: '包含输入框和提交按钮的表单',
      schema: {
        componentName: 'TinyForm',
        props: {
          labelPosition: 'top',
          labelWidth: '120px'
        },
        children: [
          {
            componentName: 'TinyFormItem',
            props: {
              label: '姓名',
              prop: 'name',
              required: true
            },
            children: [
              {
                componentName: 'TinyInput',
                props: {
                  placeholder: '请输入姓名'
                }
              }
            ]
          },
          {
            componentName: 'TinyFormItem',
            props: {
              label: '',
              prop: 'submit'
            },
            children: [
              {
                componentName: 'TinyButton',
                props: {
                  type: 'primary',
                  children: '提交'
                }
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

### 片段定义格式

```typescript
interface CustomSnippet {
  name: string;              // 片段名称
  description: string;       // 片段描述
  schema: CardSchema;        // 组件 Schema
}
```

### 常见片段示例

#### 登录表单

```vue
<script setup>
const customConfig = {
  customSnippets: [
    {
      name: '登录表单',
      description: '包含用户名和密码输入框的登录表单',
      schema: {
        componentName: 'TinyForm',
        props: {
          labelPosition: 'top'
        },
        children: [
          {
            componentName: 'TinyFormItem',
            props: {
              label: '用户名',
              prop: 'username',
              required: true
            },
            children: [
              {
                componentName: 'TinyInput',
                props: {
                  placeholder: '请输入用户名'
                }
              }
            ]
          },
          {
            componentName: 'TinyFormItem',
            props: {
              label: '密码',
              prop: 'password',
              required: true
            },
            children: [
              {
                componentName: 'TinyInput',
                props: {
                  type: 'password',
                  placeholder: '请输入密码'
                }
              }
            ]
          },
          {
            componentName: 'TinyFormItem',
            props: {
              label: ''
            },
            children: [
              {
                componentName: 'TinyButton',
                props: {
                  type: 'primary',
                  children: '登录',
                  onClick: {
                    type: 'JSFunction',
                    value: "function() { this.callAction('continueChat', { message: '登录' }); }"
                  }
                }
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

#### 商品列表

```vue
<script setup>
const customConfig = {
  customSnippets: [
    {
      name: '商品列表',
      description: '展示商品列表的卡片布局',
      schema: {
        componentName: 'Page',
        children: [
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
                      name: '商品名称',
                      price: 99,
                      image: 'https://example.com/product.jpg'
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

## 完整示例

<demo vue="../../../demos/chat/custom-components-snippets.vue" />

## 注意事项

1. **组件注册**：自定义组件需要在 `SchemaRenderer` 的 `customComponents` prop 中注册对应的 Vue 组件
2. **Schema 格式**：确保自定义组件和片段的 Schema 格式正确
3. **描述清晰**：提供清晰的描述有助于 AI 正确理解和使用这些组件和片段
4. **后端配置**：这些配置会通过 `metadata.tinygenui` 传递给后端，后端需要处理这些配置
