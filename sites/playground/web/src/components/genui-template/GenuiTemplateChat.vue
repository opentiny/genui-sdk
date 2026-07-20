<script setup lang="ts">
import { ref, watch, computed, h, inject, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import '@opentiny/tiny-robot/dist/style.css';
import {
  TrBubbleList,
  TrSender,
  TrBubbleProvider,
  useTheme,
  BubbleMarkdownContentRenderer,
} from '@opentiny/tiny-robot';
import { GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IChatMessage } from '@opentiny/genui-sdk-core';
import { IconAi, IconUser, IconArrowDown } from '@opentiny/tiny-robot-svgs';
import type { BubbleRoleConfig } from '@opentiny/tiny-robot';
import {  scrollEnd, throttle, GENUI_CONFIG } from '@opentiny/genui-sdk-vue';
import type { IMessage } from '@opentiny/genui-sdk-vue';
import copy from 'clipboard-copy';
import type {
  INotificationPayload,
  IMessageItem,
  IJsonPatchMessageItem,
  ISchemaCardMessageItem,
  ISchemaManualMessageItem,
} from './chat.types';
import {
  finalizePendingSchemaCard,
  getLastUserMessage,
  isManualSchemaSaveMessage,
} from './template-chat-utils';
import { generateId } from '../../utils';
import { useTemplateContext } from './composables';
import AssistantFooter from './TemplateAssistantFooter.vue';
import TemplateSchemaMessageRenderer from './TemplateSchemaMessageRenderer.vue';
import useIcon from '../../use-icon';
import { t } from '../../i18n';

const { addIcons } = useIcon();
addIcons(IconAi, IconUser, IconArrowDown);

const props = defineProps<{
  messages?: IMessage[];
}>();

const TinyGenuiConfig: any = inject(GENUI_CONFIG, null);
const { setColorMode } = useTheme();
const prevSchema = ref<string>('');
const { schema, conversation, versionControl, stream, emitter } = useTemplateContext();
const {
  errorMessagesMap,
  handleSchemaJsonChanged,
  resetLastPreviewSchema,
} = stream;

watch(
  () => TinyGenuiConfig?.value?.theme,
  (theme) => {
    if (theme === 'dark') {
      setColorMode(theme);
    } else {
      setColorMode('light');
    }
  },
  {
    immediate: true,
  },
);

const messageManager = computed(() => conversation.conversationKit?.messageManager.value ?? null);

const messages = computed(() => messageManager.value?.messages.value ?? []);

const generating = computed(() =>
  messageManager.value
    ? GeneratingStatus.includes(messageManager.value.messageState.status)
    : false,
);

const messagesContainer: Ref<HTMLElement | undefined> = ref();

const roles: Record<string, BubbleRoleConfig> = {
  assistant: {
    placement: 'start',
    avatar: h(IconAi, { style: { fontSize: '32px' } }),
    maxWidth: '100%',
    customContentField: 'messages',
    slots: {
      trailer: (slotProps: { bubbleProps: any; index?: number }) => {
        const chatMessage = slotProps.index !== undefined
          ? messageManager.value?.messages.value[slotProps.index]
          : undefined;
        if (chatMessage && isManualSchemaSaveMessage(chatMessage)) {
          return null;
        }

        const isFinished =
          slotProps.bubbleProps.role !== 'assistant' ||
          (slotProps.index !== undefined && slotProps.index !== messages.value.length - 1) ||
          !generating.value;
        return h(AssistantFooter, {
          bubbleProps: slotProps.bubbleProps,
          index: slotProps.index,
          isFinished,
          messageManager: messageManager.value!,
          chatMessage: (messageManager.value?.messages.value[slotProps.index] || {}) as IChatMessage,
          onRefresh: handleRefresh,
          onCopy: handleCopy,
        });
      },
    },
  },
  user: {
    placement: 'end',
    maxWidth: '90%',
    avatar: h(IconUser, { style: { fontSize: '32px' } }),
    customContentField: 'messages',
  },
};

onMounted(() => {
  emitter.on('schema-json-changed', handleSchemaJsonChanged);
});
onUnmounted(() => {
  emitter.off('schema-json-changed', handleSchemaJsonChanged);
});

const getCardMessageByIndex = (index: number) => {
  return (
    (messages.value[index]?.messages as IMessageItem[] | undefined)?.find(
      (
        message,
      ): message is IJsonPatchMessageItem | ISchemaCardMessageItem | ISchemaManualMessageItem =>
        message.type === 'schema-card'
        || message.type === 'json-patch'
        || message.type === 'schema-manual',
    ) || ({} as IJsonPatchMessageItem | ISchemaCardMessageItem)
  );
};

const handleRefresh = ({ index }: { index: number }) => {
  if (!messageManager.value) {
    return;
  }
  const { messages, send } = messageManager.value;
  const cardMessage = getCardMessageByIndex(index);

  prevSchema.value = cardMessage?.prevSchema ?? '';

  if (cardMessage?.type === 'schema-card') {
    schema.setCurrentSchema(null);
    schema.setCurrentPreviewSchema({});
    resetLastPreviewSchema({});
  } else {
    let parsedSchema = null;
    try {
      parsedSchema = JSON.parse(prevSchema.value);
    } catch (error) {
      parsedSchema = null;
    }
    if (parsedSchema) {
      schema.setCurrentSchema(parsedSchema);
      schema.setCurrentPreviewSchema(parsedSchema);
      resetLastPreviewSchema(JSON.parse(JSON.stringify(parsedSchema)));
    }
  }

  messages.value = messages.value.slice(0, index);

  const lastUserMessage = getLastUserMessage(messages.value);
  if (lastUserMessage && !lastUserMessage.messageId) {
    lastUserMessage.messageId = generateId();
  }
  schema.setCurrentCardId(String(lastUserMessage?.messageId ?? generateId()));

  versionControl.onSchemaRefresh();
  send();
};

const handleCopy = async ({ index }: { index: number }) => {
  try {
    await copy((messages.value[index]?.content as string) || '');
  } catch (error) {
    console.error('复制失败', error);
  }
};

const markdownRenderer = new BubbleMarkdownContentRenderer({
  defaultAttrs: { class: 'markdown-content' },
  mdConfig: { html: true },
});

const createSchemaMessageRenderer = (type: 'json-patch' | 'schema-card' | 'schema-manual') => (props: unknown) =>
  h(TemplateSchemaMessageRenderer, {
    itemProps: props,
    type,
    prevSchema: prevSchema.value,
    errorMessagesMap: errorMessagesMap.value,
  });

const messageRenderers = {
  markdown: markdownRenderer,
  'json-patch': createSchemaMessageRenderer('json-patch'),
  'schema-card': createSchemaMessageRenderer('schema-card'),
  'schema-manual': createSchemaMessageRenderer('schema-manual'),
};

const inputMessage = computed({
  get: () => messageManager.value?.inputMessage.value ?? '',
  set: (v: string) => {
    if (messageManager.value) {
      messageManager.value.inputMessage.value = v;
    }
  },
});

if (props.messages?.length) {
  messages.value.splice(0, messages.value.length, ...(props.messages as any));
}

const { scrollToBottom, autoScrollToBottom, isLastMessageInBottom } = scrollEnd(messagesContainer);
const throttledScrollToBottom = throttle(autoScrollToBottom, 400);

const showMessages = computed(() => {
  let list = messages.value;

  if (messageManager.value?.messageState.status === STATUS.PROCESSING) {
    return [
      ...list,
      {
        role: 'assistant',
        content: t('loading.thinking'),
        loading: true,
      },
    ];
  }

  const lastMessage = messages.value[messages.value.length - 1];

  if (generating.value && lastMessage?.role === 'assistant') {
    const existingMessages = Array.isArray((lastMessage as any)?.messages) ? (lastMessage as any).messages : [];
    const hasLoadingText = existingMessages.some((msg: any) => msg.type === 'loading-text');

    if (!hasLoadingText) {
      return [
        ...list.slice(0, -1),
        {
          ...lastMessage,
          messages: [
            ...existingMessages,
            {
              type: 'loading-text',
              emitter,
              message: lastMessage,
              showThinkingResult: false,
            },
          ],
        },
      ];
    }
  }

  return list;
});

const clearInputMessage = () => {
  inputMessage.value = '';
};

const handleSendMessage = async () => {
  const messageContent = inputMessage.value;
  const cardId = generateId();
  schema.setCurrentCardId(cardId);

  const userMessage: ChatMessage = {
    role: 'user',
    content: messageContent,
    messageId: cardId,
  };
  messages.value.push(userMessage);

  if (messages.value.length === 1 && messages.value[0].role === 'user') {
    const currentConversationId = conversation.templateConversationState?.currentId;
    if (currentConversationId) {
      conversation.updateConversationTitle(currentConversationId, messageContent.substring(0, 20));
    }
  }

  prevSchema.value = JSON.stringify(schema.currentSchema);
  messageManager.value?.send();
  clearInputMessage();
  scrollToBottom();
};

const finalizeStreamingSchemaCard = () => {
  finalizePendingSchemaCard(messages.value, {
    cardId: schema.currentCardId,
    schema: schema.currentPreviewSchema ?? schema.currentSchema,
    prevSchema: prevSchema.value || '',
  });
};

const handleNotification = (event: INotificationPayload) => {
  if (event.type === 'done') {
    schema.setCurrentSchema(schema.currentPreviewSchema);
    finalizeStreamingSchemaCard();
  }
};

watch(() => messages.value, throttledScrollToBottom, { deep: true });

onMounted(() => {
  emitter.on('notification', handleNotification);
});

onUnmounted(() => {
  emitter.off('notification', handleNotification);
});
</script>

<template>
  <div class="tg-chat-container" :class="{ 'dark': TinyGenuiConfig?.theme === 'dark' }">
    <div class="messages-container" ref="messagesContainer">
      <tr-bubble-provider :content-renderers="messageRenderers">
        <tr-bubble-list v-if="showMessages.length" :items="showMessages" :roles="roles" auto-scroll> </tr-bubble-list>
      </tr-bubble-provider>
    </div>
    <div class="sender-container">
      <div
        :class="['scroll-to-bottom-button', { 'is-generating': generating }]"
        v-show="!isLastMessageInBottom"
        @click="scrollToBottom"
      >
        <IconArrowDown class="icon-arrow-down" />
      </div>
      <tr-sender
        v-model="inputMessage"
        :placeholder="generating ? t('loading.thinking') : t('template.inputPlaceholder')"
        :clearable="true"
        :loading="generating"
        :showWordLimit="true"
        :maxLength="5000"
        @clear="clearInputMessage"
        @submit="handleSendMessage"
        @cancel="() => messageManager?.abortRequest()"
      >
      </tr-sender>
      <div class="footer-text">{{ t('footer.aiGenerated') }}</div>
    </div>
  </div>
</template>

<style scoped lang="less">
.tg-chat-container {
  --ti-gen-chat-container-bg-color: #f0f0f0;
  --thinking-display: initial;
  --sender-bg: url('../../assets/images/sender-light.svg') no-repeat center;
  --sender-border-color: #e5e5e5;
  --generating-bg-before: linear-gradient(90deg, #fff, #a2c7f4);
  --generating-bg-after: #fff;
  box-sizing: border-box;
  height: 100%;
  color: var(--tr-text-primary);
  background-color: var(--ti-gen-chat-container-bg-color);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: auto;
  &.dark {
    --ti-gen-chat-container-bg-color: #191919;
    --sender-bg: url('../../assets/images/sender-dark.svg') no-repeat center;
    --sender-border-color: #333;
    --generating-bg-before: linear-gradient(90deg, #262626, #808080);
    --generating-bg-after: #191919;
  }
}

.is-loading-in-top {
  margin-top: -48px;
}

.messages-container {
  flex: 1;
  overflow: auto;

  &::-webkit-scrollbar {
    width: 10px;
  }
}

:deep(.tr-bubble__loading) {
  margin-top: 8px;
}

:deep(.tr-bubble.placement-start) {
  .tr-bubble__content {
    padding: 0;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
  }
}

:deep(.tr-bubble.placement-start:has(.schema-version-card)),
:deep(.tr-bubble.placement-end:has(.schema-version-card)) {
  .tr-bubble__content {
    padding: 0;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
  }
}

:deep(.tr-bubble[data-role='assistant'] .tr-bubble__content-items) {
  > [type]:not([type='']):not([type='schema-card']):not([type='schema-manual']):not([type='loading-text']) {
    display: var(--thinking-display, initial);
  }
}

:deep(.tr-bubble__step-tool) {
  & + .tr-bubble__step-tool {
    margin-top: 16px;
  }
}

:deep(.tr-bubble.placement-end) {
  width: 100%;
}

:deep(.tr-bubble__content-wrapper) {
  @avatar-and-gap-width: 56px;
  max-width: calc(100% - @avatar-and-gap-width * 2);

  .tr-bubble__content {
    max-width: 100%;
  }

  .tr-bubble__content-items {
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  :deep(.tr-bubble__content-wrapper) {
    max-width: calc(100% - 12px);
  }

  :deep(.tr-bubble__content-wrapper .tr-bubble__content-items) {
    overflow-x: hidden;
  }
}

.sender-container {
  position: relative;
  flex-shrink: 0;
  padding: 16px 0;
  background: var(--sender-bg);

  .attachments-container {
    padding: 0 20px;
  }
}

.scroll-to-bottom-button {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: -35px;
  width: 40px;
  height: 40px;
  background-color: var(--generating-bg-after);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid var(--sender-border-color);
  z-index: 1000;

  & > svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    box-shadow:
      0px 10px 20px 0px #0000001a,
      0px 0px 1px 0px #00000026;
  }

  &.is-generating {
    border: none;
    background-color: transparent;

    &::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      width: calc(100% + 4px);
      height: calc(100% + 4px);
      border-radius: 50%;
      background: var(--generating-bg-before);
      z-index: 0;
      animation: rotate-border 2s linear infinite;
    }

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: var(--generating-bg-after);
      z-index: 1;
    }

    & > svg {
      z-index: 2;
    }
  }
}

@keyframes rotate-border {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes text-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

.tiny-sender {
  width: 80%;
  margin: 0 auto;
}

.footer-text {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 16px;
}
</style>
