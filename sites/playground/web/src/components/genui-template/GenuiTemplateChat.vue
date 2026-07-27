<script setup lang="ts">
import { ref, watch, computed, h, inject, onMounted, onUnmounted, provide, type Ref } from 'vue';
import '@opentiny/tiny-robot/dist/style.css';
import { TrBubbleList, TrSender, TrBubbleProvider, useTheme } from '@opentiny/tiny-robot';
import type { BubbleMessage, BubbleRoleConfig } from '@opentiny/tiny-robot';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IChatMessage } from '@opentiny/genui-sdk-core';
import { IconAi, IconUser, IconArrowDown } from '@opentiny/tiny-robot-svgs';
import { scrollEnd, throttle, GENUI_CONFIG } from '@opentiny/genui-sdk-vue';
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
import useIcon from '../../use-icon';
import { t } from '../../i18n';
import { templateContentRendererMatches, templateContentResolver } from './contentRendererMatches';
import { TEMPLATE_CHAT_CONTEXT } from './templateChatContext';

const { addIcons } = useIcon();
addIcons(IconAi, IconUser, IconArrowDown);

const props = defineProps<{
  messages?: IMessage[];
}>();

const TinyGenuiConfig: any = inject(GENUI_CONFIG, null);
const { setColorMode } = useTheme();
const prevSchema = ref<string>('');
const { schema, conversation, versionControl, stream, emitter, actions } = useTemplateContext();
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

const messageManager = computed(() => conversation.messageManager ?? null);
const messages = computed(() => (conversation.messages ?? []) as ChatMessage[]);
const isProcessing = computed(() => messageManager.value?.isProcessing?.value ?? false);

provide(TEMPLATE_CHAT_CONTEXT, {
  prevSchema,
  errorMessagesMap,
  allMessages: messages as Ref<BubbleMessage[]>,
  onSchemaVersionToggle: (schemaValue: Record<string, unknown>, cardId: string) => {
    actions.handleSchemaVersionToggle(schemaValue, cardId);
  },
});

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
  const { messages: mgrMessages, send } = messageManager.value;
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
    } catch {
      parsedSchema = null;
    }
    if (parsedSchema) {
      schema.setCurrentSchema(parsedSchema);
      schema.setCurrentPreviewSchema(parsedSchema);
      resetLastPreviewSchema(JSON.parse(JSON.stringify(parsedSchema)));
    }
  }

  mgrMessages.value = mgrMessages.value.slice(0, index);

  const lastUserMessage = getLastUserMessage(mgrMessages.value as ChatMessage[]);
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

const buildAssistantFooterProps = (slotProps: {
  messages: BubbleMessage[];
  messageIndexes: number[];
  role?: string;
}) => {
  const index = slotProps.messageIndexes[slotProps.messageIndexes.length - 1];
  const chatMessage = messages.value[index];
  if (!chatMessage || isManualSchemaSaveMessage(chatMessage)) {
    return null;
  }
  const isFinished = index !== messages.value.length - 1 || !isProcessing.value;
  return {
    index,
    bubbleProps: { role: 'assistant', ...chatMessage },
    isFinished,
    messageManager: messageManager.value!,
    chatMessage: chatMessage as IChatMessage,
  };
};

const roleConfigs: Record<string, BubbleRoleConfig> = {
  assistant: {
    placement: 'start',
    avatar: h(IconAi, { style: { fontSize: '32px' } }),
  },
  user: {
    placement: 'end',
    avatar: h(IconUser, { style: { fontSize: '32px' } }),
  },
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
  messages.value.splice(0, messages.value.length, ...(props.messages as ChatMessage[]));
}

const messagesContainer: Ref<HTMLElement | undefined> = ref();
const { scrollToBottom, autoScrollToBottom, isLastMessageInBottom } = scrollEnd(messagesContainer);
const throttledScrollToBottom = throttle(autoScrollToBottom, 400);

const showMessages = computed(() => {
  const list = messages.value;
  const lastMessage = list[list.length - 1] as (ChatMessage & { messages?: { type?: string }[] }) | undefined;

  if (!isProcessing.value || lastMessage?.role !== 'assistant') {
    return list;
  }

  const existingMessages = Array.isArray(lastMessage.messages) ? lastMessage.messages : [];
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
});

const clearInputMessage = () => {
  inputMessage.value = '';
};

const handleSendMessage = async () => {
  const manager = messageManager.value;
  if (!manager || isProcessing.value) {
    return;
  }

  const messageContent = inputMessage.value?.trim();
  if (!messageContent) {
    return;
  }

  const cardId = generateId();
  schema.setCurrentCardId(cardId);

  const userMessage: ChatMessage = {
    role: 'user',
    content: messageContent,
    messageId: cardId,
  };

  if (manager.messages.value.length === 0) {
    const currentConversationId = conversation.templateConversationState?.currentId;
    if (currentConversationId) {
      conversation.updateConversationTitle(currentConversationId, messageContent.substring(0, 20));
    }
  }

  prevSchema.value = JSON.stringify(schema.currentSchema);
  clearInputMessage();
  await manager.send(userMessage);
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
    conversation.updateConversationLastSchema(schema.currentSchema);
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
  <div class="tg-chat-container" :class="{ dark: TinyGenuiConfig?.theme === 'dark' }">
    <div class="messages-container" ref="messagesContainer">
      <tr-bubble-provider v-if="showMessages.length" :content-renderer-matches="templateContentRendererMatches">
        <tr-bubble-list
          :messages="showMessages"
          :role-configs="roleConfigs"
          :content-resolver="templateContentResolver"
          content-render-mode="split"
          auto-scroll
        >
          <template #after="slotProps">
            <AssistantFooter
              v-if="slotProps.role === 'assistant' && buildAssistantFooterProps(slotProps)"
              v-bind="buildAssistantFooterProps(slotProps)!"
              @refresh="handleRefresh"
              @copy="handleCopy"
            />
          </template>
        </tr-bubble-list>
      </tr-bubble-provider>
    </div>
    <div class="sender-container">
      <div
        :class="['scroll-to-bottom-button', { 'is-generating': isProcessing }]"
        v-show="!isLastMessageInBottom"
        @click="scrollToBottom"
      >
        <IconArrowDown class="icon-arrow-down" />
      </div>
      <tr-sender
        v-model="inputMessage"
        :placeholder="isProcessing ? t('loading.thinking') : t('template.inputPlaceholder')"
        :clearable="true"
        :loading="isProcessing"
        :show-word-limit="true"
        :max-length="5000"
        @clear="clearInputMessage"
        @submit="handleSendMessage"
        @cancel="messageManager?.abortRequest()"
      />
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

:deep(.tr-bubble[data-placement='start']) {
  .tr-bubble__content {
    padding: 0;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
  }

  .tr-bubble__box {
    padding: 0;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
    border: none;
    overflow: visible;
  }

  .tr-bubble__box:has([data-type='schema-card']) {
    width: fit-content;
    max-width: 100%;
  }
}

:deep(.tr-bubble[data-role='assistant']) {
  --content-bg: var(--tr-container-bg-default, #fff);
  --text-color: var(--tr-text-primary, #191919);
}

:deep(.tr-bubble[data-role='assistant'] [data-type='markdown']),
:deep(.tr-bubble[data-role='assistant'] [data-type='reasoning']) {
  display: var(--thinking-display, initial);
}

:deep(.tr-bubble[data-placement='end']) {
  width: 100%;
  --tr-bubble-box-padding: 16px 24px;
  --tr-bubble-text-font-size: 16px;
  --tr-bubble-box-shape-rounded-radius: 24px;
}

:deep(.tr-bubble__body) {
  .tr-bubble__content {
    @avatar-and-gap-width: 56px;
    max-width: calc(100% - var(--ti-gen-chat-avatar-and-gap-width, @avatar-and-gap-width) * 2);
    overflow: visible;
  }
}

:deep(.tr-bubble[data-placement='start'] .schema-render-container) {
  width: fit-content;
  background-color: var(--tr-container-bg-default, #fff);
  border-radius: 24px;
}

.sender-container {
  position: relative;
  flex-shrink: 0;
  padding: 16px 0;
  background: var(--sender-bg);
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

  &.is-generating {
    border: none;
    background-color: transparent;

    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      background: var(--generating-bg-before);
      z-index: 0;
      animation: rotate-border 2s linear infinite;
    }

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background-color: var(--generating-bg-after);
      z-index: 1;
    }

    & > svg {
      z-index: 2;
    }
  }
}

.footer-text {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 16px;
}

.tr-sender {
  width: 80%;
  margin: 0 auto;
}

@keyframes rotate-border {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
