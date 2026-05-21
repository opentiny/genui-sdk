# Chat 组件 - 自定义底部工具栏

`GenuiChat` 组件支持为不同角色的消息配置自定义底部工具栏，你可以在每条消息下方添加操作按钮（复制、点赞、踩、刷新等），用于增强交互体验。

## 给 Chat 组件传递自定义底部工具栏

通过 `roles` 属性为助手和用户分别配置消息底部工具栏。每个角色下可以通过 `slots.trailer` 指定对应的底部组件。

```vue {12-23}
<template>
  <GenuiChat :url="url" :roles="roles" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import AssistantFooter from './components/assistant-footer.vue';
import UserFooter from './components/user-footer.vue';

const url = 'https://your-chat-backend/api';

const roles = {
  assistant: {
    slots: {
      trailer: AssistantFooter,
    },
  },
  user: {
    slots: {
      trailer: UserFooter,
    },
  },
};
</script>
```

## 插槽入参说明

```typescript
interface IBubbleSlotsProps {
  index: number;
  bubbleProps: BubbleProps;
  isFinished: boolean;
  messageManager: UseMessageReturn;
}
```

- `index`: 当前消息在消息列表中的索引（从 0 开始）
- `bubbleProps`: 当前气泡的渲染属性，包含 `content` 等信息
- `isFinished`: 当前回答是否已经结束，通常可以用来控制工具栏是否展示
- `messageManager`: 消息管理器，包含当前消息列表和发送等方法

`BubbleProps` 和 `UseMessageReturn` 详情可以查看 TinyRobot 相关文档

查看 [BubbleProps](https://docs.opentiny.design/tiny-robot/guide/bubble.html#props) 定义与用法

查看 [UseMessageReturn](https://docs.opentiny.design/tiny-robot/guide/message.html#%E8%BF%94%E5%9B%9E%E5%80%BC) 定义与用法

## 创建 user 底部工具栏组件

详细代码请参考完整示例的`user-footer.vue`

## 创建 assistant 底部工具栏组件

详细代码请参考完整示例`assistant-footer.vue`

## 完整示例

完整可运行示例可参考下面的 Demo：

<demo vue="../../../demos/chat/footer-toolbar.vue" :vueFiles="['../../../demos/chat/footer-toolbar.vue', '../../../demos/chat/components/assistant-footer.vue', '../../../demos/chat/components/user-footer.vue']" />
