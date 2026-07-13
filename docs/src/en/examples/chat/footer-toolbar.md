# Chat Component - Custom Footer Toolbar

The `GenuiChat` component supports custom footer toolbars for messages from different roles. You can add action buttons below each message (copy, like, dislike, refresh, etc.) to enhance the interaction experience.

## Passing a Custom Footer Toolbar to GenuiChat

Configure message footer toolbars for assistant and user roles via the `roles` prop. Under each role, specify the footer component with `slots.trailer`.

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

## Slot Props

```typescript
interface IBubbleSlotsProps {
  index: number;
  bubbleProps: BubbleProps;
  isFinished: boolean;
  messageManager: UseMessageReturn;
}
```

- `index`: Index of the current message in the message list (starting from 0)
- `bubbleProps`: Render props for the current bubble, including `content` and other fields
- `isFinished`: Whether the current reply has finished; typically used to control toolbar visibility
- `messageManager`: Message manager containing the current message list, send methods, and more

See TinyRobot documentation for details on `BubbleProps` and `UseMessageReturn`.

See [BubbleProps](https://docs.opentiny.design/tiny-robot/guide/bubble.html#props) for definition and usage.

See [UseMessageReturn](https://docs.opentiny.design/tiny-robot/guide/message.html#%E8%BF%94%E5%9B%9E%E5%80%BC) for definition and usage.

## Creating the User Footer Toolbar Component

See `user-footer.vue` in the full example for detailed code.

## Creating the Assistant Footer Toolbar Component

See `assistant-footer.vue` in the full example for detailed code.

## Full Example

See the runnable demo below:

<demo vue="../../../../demos/en/chat/footer-toolbar.vue" :vueFiles="['../../../../demos/en/chat/footer-toolbar.vue', '../../../../demos/en/chat/components/assistant-footer.vue', '../../../../demos/en/chat/components/user-footer.vue']" />
