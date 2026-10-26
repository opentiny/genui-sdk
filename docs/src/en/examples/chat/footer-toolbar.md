# Chat Component - Custom Footer Toolbar

The `GenuiChat` component supports custom footer toolbars for messages from different roles. You can add action buttons below each message (copy, like, dislike, refresh, etc.) to enhance the interaction experience.

## Passing a Custom Footer Toolbar to GenuiChat

Use the `after` slot (or `content-footer` when the toolbar should be inside the content area),
then select the assistant or user toolbar from the slot's `role`.

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

## Slot Props

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

- `messages`: Messages merged into the current bubble
- `messageIndexes`: Their original indexes in the message engine
- `role`: Role of the current bubble
- `isFinished`: Whether the current reply has finished; typically used to control toolbar visibility
- `messageEngine`: Message engine for the active conversation, including messages, send, and request state
- `conversation`: Conversation manager returned by the official `useConversation`

See the TinyRobot documentation for `UseMessageReturn` and `UseConversationReturn`.

## Creating the User Footer Toolbar Component

See `user-footer.vue` in the full example for detailed code.

## Creating the Assistant Footer Toolbar Component

See `assistant-footer.vue` in the full example for detailed code.

## Full Example

See the runnable demo below:

<demo vue="../../../../demos/en/chat/footer-toolbar.vue" :vueFiles="['../../../../demos/en/chat/footer-toolbar.vue', '../../../../demos/en/chat/components/assistant-footer.vue', '../../../../demos/en/chat/components/user-footer.vue']" />
