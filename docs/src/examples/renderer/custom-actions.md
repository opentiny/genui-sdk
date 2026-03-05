# Renderer 组件 - 自定义 Actions

自定义 Actions 可以自行编写执行代码从而实现复杂的交互逻辑，需配合提示词让 LLM 输出对应 schemaJson 调用 Actions

## 给组件传递自定义 Actions

通过 `customActions` prop 向 `GenuiRenderer` 组件传递自定义动作。每个自定义 Action 需要包含以下属性：

- `name`: 动作名称
- `description`: 动作描述
- `execute`: 执行函数，接收 `params` 和 `context` 两个参数
- `params`: 参数定义数组（可选），用于描述动作接收的参数，大模型根据描述生成参数传递给`execute`第一个参数

### execute 函数参数说明

- `params`: 调用动作时传入的参数对象
- `context`: 渲染器的上下文信息，包含渲染器的状态和方法，可以通过 `context.state` 获取全局双向绑定状态

### 示例 1：打开新页面

```vue {12-35}
<template>
  <GenuiRenderer :content="content" :generating="generating" :customActions="customActions" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({});

const customActions = {
  openPage: {
    name: 'openPage',
    description: '打开新页面',
    execute: (params: any, context: Record<string, any>) => {
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
</script>
```

#### 完整示例：

<demo vue="../../../demos/renderer/custom-actions-open-page.vue" />

### 示例 2：显示表单实时绑定的内容

```vue {12-33}
<template>
  <GenuiRenderer :content="content" :generating="generating" :customActions="customActions" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({});

const customActions = {
  showNotification: {
    name: 'showNotification',
    description: '显示通知，弹出表单中实时绑定的内容',
    execute: (params: any, context: Record<string, any>) => {
      const state = context.state;
      const message = JSON.stringify(state);

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
</script>
```

#### 完整示例：

<demo vue="../../../demos/renderer/custom-actions-form.vue" />
