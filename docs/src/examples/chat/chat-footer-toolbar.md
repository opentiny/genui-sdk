# Chat 组件 - 自定义底部工具栏

`GenuiChat` 组件支持自定义底部工具栏，允许你为消息气泡添加自定义的底部内容。

## 基础用法

通过 `footerComponent` 可以自定义用户和助手消息的底部工具栏。

```vue
<template>
  <GenuiChat
    :url="url"
    :customizeSetting="customizeSetting"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import CustomFooter from './CustomFooter.vue';

const url = 'https://your-chat-backend/api';

const customizeSetting = {
  footerComponent: {
    user: CustomFooter,      // 用户消息的底部组件
    assistant: CustomFooter  // 助手消息的底部组件
  }
};
</script>
```

## 创建底部组件

底部组件会接收 `BubbleProps` 作为 props：

```vue
<!-- CustomFooter.vue -->
<template>
  <div class="message-footer">
    <button @click="handleCopy">复制</button>
    <button @click="handleShare">分享</button>
    <button @click="handleDelete">删除</button>
  </div>
</template>

<script setup lang="ts">
import type { BubbleProps } from '@opentiny/tiny-robot';

const props = defineProps<BubbleProps>();

function handleCopy() {
  // 复制消息内容
  const text = props.bubble?.content || '';
  navigator.clipboard.writeText(text);
  console.log('已复制到剪贴板');
}

function handleShare() {
  // 分享消息
  console.log('分享消息');
}

function handleDelete() {
  // 删除消息
  console.log('删除消息');
}
</script>

<style scoped>
.message-footer {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid #eee;
  margin-top: 8px;
}

.message-footer button {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.message-footer button:hover {
  background: #f5f5f5;
}
</style>
```

## 区分用户和助手消息

可以为用户和助手消息使用不同的底部组件：

```vue
<template>
  <GenuiChat
    :url="url"
    :customizeSetting="customizeSetting"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import UserFooter from './UserFooter.vue';
import AssistantFooter from './AssistantFooter.vue';

const url = 'https://your-chat-backend/api';

const customizeSetting = {
  footerComponent: {
    user: UserFooter,           // 用户消息使用 UserFooter
    assistant: AssistantFooter   // 助手消息使用 AssistantFooter
  }
};
</script>
```

## 访问消息数据

底部组件可以通过 `BubbleProps` 访问消息的相关数据：

```vue
<!-- CustomFooter.vue -->
<template>
  <div class="message-footer">
    <span class="message-time">{{ formatTime(bubble?.timestamp) }}</span>
    <button @click="handleCopy">复制</button>
    <button v-if="isUserMessage" @click="handleEdit">编辑</button>
    <button @click="handleDelete">删除</button>
  </div>
</template>

<script setup lang="ts">
import type { BubbleProps } from '@opentiny/tiny-robot';
import { computed } from 'vue';

const props = defineProps<BubbleProps>();

const isUserMessage = computed(() => {
  return props.bubble?.role === 'user';
});

function formatTime(timestamp?: number) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
}

function handleCopy() {
  const text = props.bubble?.content || '';
  navigator.clipboard.writeText(text);
}

function handleEdit() {
  // 编辑消息
  console.log('编辑消息');
}

function handleDelete() {
  // 删除消息
  console.log('删除消息');
}
</script>
```

## 完整示例

<demo vue="../../../demos/chat/footer-toolbar.vue" />

## 注意事项

1. **BubbleProps 类型**：确保组件正确接收 `BubbleProps` 类型
2. **响应式更新**：底部组件会在消息更新时重新渲染
3. **性能考虑**：避免在底部组件中执行重计算，保持组件轻量
4. **样式隔离**：使用 scoped 样式避免样式冲突
