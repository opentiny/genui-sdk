# Chat 组件 - 自定义底部工具栏

`GenuiChat` 组件支持为不同角色的消息配置自定义底部工具栏，你可以在每条消息下方添加操作按钮（复制、点赞、踩、刷新等），用于增强交互体验。

## 给 Chat 组件传递自定义底部工具栏

使用 `after`（或需要放在内容内部时使用 `content-footer`）插槽配置消息底部工具栏，
再根据插槽参数中的 `role` 区分助手和用户消息。

```vue {12-23}
<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat :url="url">
      <template #after="slotProps">
        <AssistantFooter v-if="slotProps.role === 'assistant'" v-bind="slotProps" />
        <UserFooter v-else-if="slotProps.role === 'user'" v-bind="slotProps" />
      </template>
    </GenuiChat>
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';
import AssistantFooter from './components/assistant-footer.vue';
import UserFooter from './components/user-footer.vue';

const url = 'https://your-chat-backend/api';

</script>
```

## 插槽入参说明

```typescript
interface IBubbleSlotsProps {
  messages: BubbleMessage[];
  messageIndexes: number[];
  role?: string;
  contentIndex?: number;
  isFinished: boolean;
  messageEngine: UseMessageReturn;
  conversation: UseConversationReturn;
}
```

- `messages`: 当前气泡合并后的消息数组
- `messageIndexes`: 这些消息在消息引擎中的原始索引
- `role`: 当前气泡角色
- `isFinished`: 当前回答是否已经结束，通常可以用来控制工具栏是否展示
- `messageEngine`: 当前会话的消息引擎，包含消息列表、发送和请求状态
- `conversation`: 官方 `useConversation` 返回的会话管理对象

`UseMessageReturn` 和 `UseConversationReturn` 详情可以查看 TinyRobot 相关文档。

## 创建 user 底部工具栏组件

详细代码请参考完整示例的`user-footer.vue`

## 创建 assistant 底部工具栏组件

详细代码请参考完整示例`assistant-footer.vue`

## 完整示例

完整可运行示例可参考下面的 Demo：

<demo vue="../../../demos/chat/footer-toolbar.vue" :vueFiles="['../../../demos/chat/footer-toolbar.vue', '../../../demos/chat/components/assistant-footer.vue', '../../../demos/chat/components/user-footer.vue']" />
