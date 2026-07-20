<script setup lang="ts">
import '@opentiny/tiny-robot/dist/style.css';
import { TrBubbleList, TrSenderCompat, TrBubbleProvider } from '@opentiny/tiny-robot';
import { IconAi, IconUser, IconArrowDown } from '@opentiny/tiny-robot-svgs';
import type { BubbleRoleConfig } from '@opentiny/tiny-robot';
import { computed, h, inject, nextTick, provide, ref, watch, type Component, type Ref } from 'vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IMessageItem } from '@opentiny/genui-sdk-core';
import type { IChatProps, ICustomActionItem, UserItem, UserTextItem } from './chat.types';
import { scrollEnd, throttle } from './chat-utils';
import { useResize } from './composable/use-resize';
import { useI18n } from './i18n';
import { emitter } from './event-emitter';
import { CUSTOM_CONTEXT, GENUI_CONFIG } from './injection-tokens';
import { cardIdSymbol } from './useChat';
import { useChatAction } from './continue-chat-action';
import { useFileUpload } from './useFileUpload';
import AttachmentsRenderer from './renderer/AttachmentsRenderer.vue';
import { type FileMeta, MIME_TYPE_MAP, buildTemplateDataFromSubmitText } from './file-upload/file-utils';
import { useGenuiConversation } from './useGenuiConversation';
import { genuiContentRendererMatches, genuiContentResolver } from './contentRendererMatches';
import { useBubbleRoleAfterSlot } from './composable/useBubbleRoleAfterSlot';
import { GENUI_SCHEMA_CARD_CONTEXT } from './schemaCardContext';
import type { GenuiChatRuntimeOptions } from './types';
import type { IResponseHandler } from './response-handler';
import type { IStreamData } from '@opentiny/genui-sdk-core';

const props = defineProps<IChatProps>();

const genuiConfig: any = inject(GENUI_CONFIG, null);
const { t } = useI18n();

const bundledCustomActions = ref<ICustomActionItem[]>([]);

const getRuntimeOptions = (): GenuiChatRuntimeOptions => ({
  url: props.url || '',
  model: props.model || '',
  temperature: props.temperature ?? 0.3,
  chatConfig: {
    addToolCallContext: false,
    showThinkingResult: false,
    ...props.chatConfig,
  },
  customComponents: props.customComponents || [],
  customSnippets: props.customSnippets || [],
  customExamples: props.customExamples || [],
  customActions: [...(props.customActions || []), ...bundledCustomActions.value],
  customFetch: props.customFetch,
});

const {
  conversation,
  inputMessage,
  messageManager,
  loading,
  sendUserMessage,
  sendUserChatMessage,
  setResponseHandlers,
  getResponseHandlers,
  handleNewConversation,
  setConversationTitle,
  importConversations,
  exportConversations,
} = useGenuiConversation({
  getRuntimeOptions,
  initialMessages: props.messages,
});

const messages = computed(() => messageManager.value.messages.value);
const isProcessing = computed(() => messageManager.value.isProcessing.value);

const isAllowFiles = computed(() => {
  const supportImage = props.features?.supportImage;
  if (supportImage && supportImage?.enabled !== false) {
    return true;
  }
  return false;
});

const buttonGroup = computed(() => {
  const fileTypes = props.features?.supportImage?.supportedFileTypes;
  const accept = fileTypes?.map((type: string) => MIME_TYPE_MAP[type.toLowerCase()]).join(',');
  return {
    file: {
      disabled: false,
      accept,
    },
  };
});

const { attachments, templateData, clearAttachments, processAttachments, handleFilesSelected, handleTemplateEdit } =
  useFileUpload();

const handleTemplateDataUpdate = (_value: UserItem[]) => {
  const updatedTemplateData = handleTemplateEdit(templateData, inputMessage.value);
  inputMessage.value = '';
  templateData.value = updatedTemplateData;
};

const clearInputMessage = () => {
  inputMessage.value = '';
  templateData.value = [];
  clearAttachments();
};

const handleRemoveAttachment = (item: FileMeta | undefined) => {
  if (!item) {
    return;
  }
  attachments.value = attachments.value.filter((attachment) => item.name !== attachment.name);
  templateData.value = templateData.value.filter((data) => data.type !== 'template' || data.content !== item.name);
};

const senderRef = ref<{ setTemplateData?: (data: UserItem[]) => void }>();

watch(
  templateData,
  async (value) => {
    await nextTick();
    senderRef.value?.setTemplateData?.(value);
  },
  { deep: true },
);

const flatAllMessages = (chatMessages: ChatMessage[]) =>
  chatMessages
    .filter((item) => item.role === 'assistant')
    .reduce((acc: IMessageItem[], chatItem) => {
      const itemMessages = (chatItem as { messages?: IMessageItem[] }).messages;
      if (Array.isArray(itemMessages)) {
        return acc.concat(...itemMessages);
      }
      return acc;
    }, []);

const getCardMessage = (cardId: string) => {
  const flatMessages = flatAllMessages(messages.value);
  return flatMessages.find((message) => 'id' in message && message.id === cardId);
};

const saveState = (context: Record<string | symbol, unknown>) => {
  const cardId = context[cardIdSymbol] as string | undefined;
  if (!cardId) {
    return;
  }
  const cardMessage = getCardMessage(cardId);
  if (cardMessage) {
    (cardMessage as IMessageItem & { state?: Record<string, unknown> }).state = JSON.parse(
      JSON.stringify(context.state || {}),
    );
  }
};

const chat = async ({
  llmFriendlyMessage,
  humanFriendlyMessage,
  context,
}: {
  llmFriendlyMessage: string;
  humanFriendlyMessage: string;
  context: Record<string, unknown>;
}) => {
  saveState(context);
  messageManager.value.addMessage({
    role: 'user',
    content: llmFriendlyMessage,
    messages: [{ type: 'custom-text', content: humanFriendlyMessage }],
  });
  await messageManager.value.send();
};

const customContext = computed(() => ({
  chat,
  generating: isProcessing.value,
}));

provide(CUSTOM_CONTEXT, customContext);

const { continueChatAction, saveStateAction } = useChatAction({ chat, saveState });
bundledCustomActions.value = [continueChatAction, saveStateAction];

const lastSchemaCardId = computed(() => {
  const lastChatMessage = messages.value[messages.value.length - 1] as
    | (ChatMessage & { messages?: IMessageItem[] })
    | undefined;
  if (lastChatMessage?.role !== 'assistant') {
    return null;
  }
  const items = lastChatMessage.messages;
  if (!Array.isArray(items) || !items.length) {
    return null;
  }
  const lastItem = items[items.length - 1];
  return 'id' in lastItem ? lastItem.id : null;
});

const isGeneratingCard = (cardId?: string) => isProcessing.value && cardId != null && lastSchemaCardId.value === cardId;

const customComponentsMap = computed(() => {
  const map: Record<string, Component> = {};
  props.customComponents?.forEach((item) => {
    if (item.ref && item.component) {
      map[item.component] = item.ref;
    }
  });
  return map;
});

const customActionsMap = computed(() => {
  const map: Record<string, ICustomActionItem> = {};
  props.customActions?.forEach((action) => {
    if (action.name) {
      map[action.name] = action;
    }
  });
  return {
    ...map,
    continueChat: continueChatAction,
    saveState: saveStateAction,
  };
});

provide(GENUI_SCHEMA_CARD_CONTEXT, {
  isGeneratingCard,
  customComponentsMap,
  customActionsMap,
  requiredCompleteFieldSelectors: computed(() => props.requiredCompleteFieldSelectors || []),
  rendererSlots: computed(() => props.rendererSlots),
});

const showMessages = computed(() => {
  const list = messages.value;
  const lastMessage = list[list.length - 1] as (ChatMessage & { messages?: { type?: string }[] }) | undefined;

  if (isProcessing.value) {
    if (!lastMessage || lastMessage.role === 'user') {
      return [
        ...list,
        {
          role: 'assistant',
          content: t('loading.thinking'),
          loading: true,
        },
      ];
    }

    if (lastMessage.role === 'assistant') {
      const existingMessages = Array.isArray(lastMessage.messages) ? lastMessage.messages : [];
      const hasLoadingText = existingMessages.some((item) => item?.type === 'loading-text');

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
                showThinkingResult: props.chatConfig?.showThinkingResult ?? false,
              },
            ],
          },
        ];
      }
    }
  }

  return list;
});

const defaultRoles: Record<string, BubbleRoleConfig> = {
  assistant: {
    placement: 'start',
    avatar: h(IconAi, { style: { fontSize: '32px' } }),
  },
  user: {
    placement: 'end',
    avatar: h(IconUser, { style: { fontSize: '32px' } }),
  },
};

const roleConfigs = computed(() => {
  const mergedRoles: Record<string, BubbleRoleConfig> = { ...defaultRoles };
  if (props.roles) {
    for (const key of Object.keys(props.roles) as Array<'user' | 'assistant'>) {
      const { slots: _slots, ...roleConfig } = props.roles[key] ?? {};
      mergedRoles[key] = {
        ...defaultRoles[key],
        ...roleConfig,
      };
    }
  }
  return mergedRoles;
});

const { renderAfterSlot } = useBubbleRoleAfterSlot({
  roles: props.roles,
  messageManager,
  allMessages: messages,
  isProcessing,
});

const createAfterSlotRenderer = (slotProps: Parameters<typeof renderAfterSlot>[0]) => ({
  render: () => renderAfterSlot(slotProps),
});

const handleSendMessage = async (content?: string) => {
  if (isProcessing.value) {
    return;
  }

  const messageContent = typeof content === 'string' ? content : inputMessage.value;
  const attachmentsValue = attachments.value.slice();
  let templateDataValue = templateData.value.slice();
  const hasAttachments = attachmentsValue.length > 0;

  if (!messageContent?.trim() && !hasAttachments) {
    return;
  }

  if (!hasAttachments) {
    await sendUserMessage(messageContent.trim());
    setConversationTitle(messageContent);
    scrollToBottom();
    return;
  }

  const userMessageContent: Array<{
    type: string;
    templateData?: UserItem[];
    attachments?: FileMeta[];
  }> = [];

  const userMessage: ChatMessage = {
    role: 'user',
    content: messageContent,
  };

  const result = await processAttachments(attachmentsValue, props.features || {});
  if (!result) {
    scrollToBottom();
    return;
  }

  templateDataValue = buildTemplateDataFromSubmitText(templateDataValue, messageContent);

  const apiContent = templateDataValue.map((templateItem) => {
    if (templateItem.type === 'template') {
      return result.apiContent.find((att: { filename?: string }) => att.filename === templateItem.content);
    }
    return {
      type: 'text',
      text: (templateItem as UserTextItem).content,
    };
  });

  if (templateDataValue.length > 0) {
    userMessageContent.push({
      type: 'templateData',
      templateData: templateDataValue,
      attachments: attachmentsValue,
    });
  }

  userMessage.content = apiContent as unknown as string;
  (userMessage as ChatMessage & { messages?: typeof userMessageContent }).messages = userMessageContent;

  clearInputMessage();
  await sendUserChatMessage(userMessage, false);
  setConversationTitle(messageContent);
  scrollToBottom();
};

const abortRequest = () => {
  void messageManager.value.abortRequest();
};

const messagesContainer: Ref<HTMLElement | undefined> = ref();
const { width: messagesContainerWidth } = useResize(messagesContainer);
const { scrollToBottom, scrollToBottomWithRetry, autoScrollToBottom, isLastMessageInBottom } =
  scrollEnd(messagesContainer);
const throttledScrollToBottom = throttle(autoScrollToBottom, 400);

watch(() => showMessages.value, throttledScrollToBottom, { deep: true });
watch(
  () => conversation.activeConversationId.value,
  () => {
    scrollToBottomWithRetry(10, 150);
  },
);

defineExpose({
  loading,
  setInputMessage: (message: string) => {
    inputMessage.value = message;
  },
  handleNewConversation,
  getConversation: () => conversation,
  getMessageEngine: () => messageManager.value,
  importConversations,
  exportConversations,
  getResponseHandlers,
  setResponseHandlers: (handlers: IResponseHandler<IStreamData>[]) => {
    setResponseHandlers(handlers);
  },
  getMessageRenderers: () => ({}),
  setMessageRenderer: () => {},
});
</script>

<template>
  <div
    class="tg-chat-container"
    :class="{
      dark: genuiConfig?.theme === 'dark',
      'is-thinking-collapsed': !props.chatConfig?.showThinkingResult,
    }"
  >
    <div
      class="messages-container"
      ref="messagesContainer"
      :style="{ '--messages-container-width': messagesContainerWidth + 'px' }"
    >
      <tr-bubble-provider v-if="showMessages.length" :content-renderer-matches="genuiContentRendererMatches">
        <tr-bubble-list
          :messages="showMessages"
          :role-configs="roleConfigs"
          :content-resolver="genuiContentResolver"
          content-render-mode="split"
          auto-scroll
        >
          <template #after="slotProps">
            <component :is="createAfterSlotRenderer(slotProps)" />
          </template>
        </tr-bubble-list>
      </tr-bubble-provider>
      <slot v-else name="empty"></slot>
    </div>
    <div class="sender-container">
      <div
        :class="['scroll-to-bottom-button', { 'is-generating': isProcessing }]"
        v-show="!isLastMessageInBottom"
        @click="scrollToBottom"
      >
        <IconArrowDown class="icon-arrow-down" />
      </div>
      <tr-sender-compat
        ref="senderRef"
        v-model="inputMessage"
        :placeholder="isProcessing ? t('placeholder.thinking') : t('placeholder.input')"
        :clearable="true"
        :allow-files="isAllowFiles"
        :button-group="buttonGroup"
        :loading="isProcessing"
        :show-word-limit="true"
        :max-length="1000"
        v-model:template-data="templateData"
        @files-selected="(files) => handleFilesSelected(files, inputMessage)"
        @update:template-data="handleTemplateDataUpdate"
        @clear="clearInputMessage"
        @submit="handleSendMessage"
        @cancel="abortRequest"
      >
        <template v-if="attachments.length > 0" #header>
          <div class="attachments-container">
            <AttachmentsRenderer :attachments="attachments" @remove="handleRemoveAttachment" />
          </div>
        </template>
      </tr-sender-compat>
      <div class="footer-text">{{ t('footer.aiGenerated') }}</div>
    </div>
  </div>
</template>

<style scoped lang="less">
.tg-chat-container {
  --ti-gen-chat-container-bg-color: #f0f0f0;
  --sender-bg: url('./assets/sender-light.svg') no-repeat center;
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
    --sender-bg: url('./assets/sender-dark.svg') no-repeat center;
    --sender-border-color: #333;
    --generating-bg-before: linear-gradient(90deg, #262626, #808080);
    --generating-bg-after: #191919;
  }
}

.messages-container {
  flex: 1;
  overflow: auto;
  word-break: break-word;
}

:deep(.tr-bubble__loading) {
  margin-top: 8px;
}

:deep(.tr-bubble[data-placement='start']) {
  .tr-bubble__box {
    padding: 0;
    background: transparent;
  }

  .tr-bubble__box:has([data-type='schema-card']),
  .tr-bubble__box[data-shape]:has([data-type='schema-card']) {
    width: 100%;
    max-width: 100%;
  }
}

.tg-chat-container.is-thinking-collapsed {
  :deep(.tr-bubble[data-role='assistant'] .tr-bubble__content) {
    gap: 0;
  }

  :deep(
    .tr-bubble[data-role='assistant']
      .tr-bubble__content
      > *:not(:has([data-type='schema-card'])):not(:has([data-type='loading-text']))
  ) {
    height: 0;
  }

  :deep(.tr-bubble[data-role='assistant'] [data-type]:not([data-type='schema-card']):not([data-type='loading-text'])) {
    display: none;
  }
}

:deep(.tr-bubble__step-tool) {
  & + .tr-bubble__step-tool {
    margin-top: 16px;
  }
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
    overflow-x: auto;
  }
}

:deep(.schema-render-container) {
  @large-screen-min-width: 400px;
  @min-width-safe-padding: 250px;
  @small-screen-min-width: calc(var(--messages-container-width) - @min-width-safe-padding);
  min-width: min(@small-screen-min-width, @large-screen-min-width);
}

:deep(.tr-bubble[data-placement='start'] .schema-render-container) {
  width: 100%;
  background-color: var(--tr-container-bg-default, #fff);
  background-clip: padding-box;
  border-radius: 24px;
  border: none;
  outline: none;
  box-shadow: none;
  overflow: hidden;
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

.footer-text {
  font-size: 12px;
  color: #999;
  text-align: center;
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
