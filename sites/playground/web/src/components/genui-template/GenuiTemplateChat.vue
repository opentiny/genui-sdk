<script setup lang="ts">
import { ref, watch, computed, h, inject, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';
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
import type { BubbleProps, BubbleRoleConfig, UserItem } from '@opentiny/tiny-robot';
import { scrollEnd, throttle, GENUI_CONFIG } from '@opentiny/genui-sdk-vue';
import type { IMessage } from '@opentiny/genui-sdk-vue';
import { TinyButton } from '@opentiny/vue';
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
  findLatestPendingSchemaCard,
  findSchemaCardByCardId,
  generateIdForComponents,
  getLastNonCompressMessage,
  getLastUserMessage,
  isContextCompressMessage,
  isManualSchemaSaveMessage,
  resolveJsonPatchApplyFailed,
  setJsonPatchApplyResult,
} from './template-chat-utils';
import { generateId } from '../../utils';
import { useSchemaDevModeOptional } from './useSchemaDevMode';
import { getComposerContent, segmentsToPlainText } from './schema-composer';
import type { SelectedSchemaNode } from './schema-node-selection';
import TemplateUserMessageRenderer from './TemplateUserMessageRenderer.vue';
import { useTemplateContext } from './composables';
import { useContextZip } from './use-context-zip';
import AssistantFooter from './TemplateAssistantFooter.vue';
import TemplateSchemaMessageRenderer from './TemplateSchemaMessageRenderer.vue';
import useIcon from '../../use-icon';
import { t } from '../../i18n';

const { addIcons } = useIcon();
addIcons(IconAi, IconUser, IconArrowDown);

const props = defineProps<{
  messages?: IMessage[];
}>();

const route = useRoute();
const TinyGenuiConfig: any = inject(GENUI_CONFIG, null);
const { setColorMode } = useTheme();
const prevSchema = ref<string>('');
const { schema, conversation, versionControl, stream, emitter } = useTemplateContext();
const schemaDevMode = useSchemaDevModeOptional();
const templateData = ref<UserItem[]>([]);
const selectedNodeMap = new Map<string, SelectedSchemaNode>();
const {
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

let inputMessageFromQueryApplied = false;
watch(
  () => ({
    queryMessage: route.query['input-message'],
    manager: messageManager.value,
    loading: conversation.templateConversationState?.loading,
  }),
  ({ queryMessage, manager, loading }) => {
    if (inputMessageFromQueryApplied) {
      return;
    }
    if (typeof queryMessage !== 'string' || !queryMessage || !manager || loading) {
      return;
    }
    manager.inputMessage.value = queryMessage;
    inputMessageFromQueryApplied = true;
  },
  { immediate: true },
);

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
  'context-compress': {
    placement: 'start',
    maxWidth: '100%',
    slots: {
      default: () => null,
    },
  },
  zip: {
    placement: 'start',
    maxWidth: '100%',
    slots: {
      default: (slotProps) => {
        return h('div', { class: 'context-zip-divider' }, [
          h('span', { class: 'context-zip-divider__line' }),
          h(
            'span',
            { class: 'context-zip-divider__text' },
            typeof slotProps?.bubbleProps?.content === 'string' ? slotProps.bubbleProps.content : '',
          ),
          h('span', { class: 'context-zip-divider__line' }),
        ]);
      },
    },
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
  resetContextZip();

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
  });

const messageRenderers = {
  markdown: markdownRenderer,
  'template-user': (props: {
    segments?: import('./schema-composer').ComposerSegment[];
    content?: string;
    selectedNodes?: { id: string; componentName: string }[];
  }) =>
    h(TemplateUserMessageRenderer, {
      segments: props.segments,
      content: props.content,
      selectedNodes: props.selectedNodes,
    }),
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

const insertComposerTag = (node: SelectedSchemaNode) => {
  if (!templateData.value.length) {
    templateData.value = [{ type: 'text', content: inputMessage.value }];
  }
  const id = generateId();
  selectedNodeMap.set(id, node);
  templateData.value = [...templateData.value, { type: 'template', content: node.componentName, id }];
};

const syncSelectedNodes = (value: UserItem[]) => {
  const nextMap = new Map<string, SelectedSchemaNode>();
  for (const item of value) {
    if (item.type !== 'template') {
      continue;
    }
    if (item.id && selectedNodeMap.has(item.id)) {
      nextMap.set(item.id, selectedNodeMap.get(item.id)!);
      continue;
    }
    for (const [id, candidate] of selectedNodeMap) {
      if (!nextMap.has(id) && candidate.componentName === item.content) {
        nextMap.set(item.id || id, candidate);
        break;
      }
    }
  }
  selectedNodeMap.clear();
  nextMap.forEach((node, id) => selectedNodeMap.set(id, node));
};

const handleTemplateDataUpdate = (value: UserItem[]) => {
  syncSelectedNodes(value);
  templateData.value = value;
};

const clearComposer = () => {
  templateData.value = [];
  selectedNodeMap.clear();
};

if (props.messages?.length) {
  messages.value.splice(0, messages.value.length, ...(props.messages as any));
}

const { scrollToBottom, autoScrollToBottom, isLastMessageInBottom } = scrollEnd(messagesContainer);
const throttledScrollToBottom = throttle(autoScrollToBottom, 400);

const currentConversationId = computed(() => conversation.templateConversationState?.currentId);

const contextZip = useContextZip({
  messages,
  generating,
  currentConversationId,
  getTemplateChatConfig: () => ({
    ...conversation.getTemplateChatBaseConfig(),
    templateSchema: schema.currentSchema,
  }),
  saveConversations: conversation.saveConversations,
  scrollToBottom,
});

const {
  isButtonDisabled,
  isCompressing,
  compress,
  showDivider,
  dividerText,
  latestCompressIndex,
  reset: resetContextZip,
} = contextZip;

const toShowMessage = (message: ChatMessage): BubbleProps => {
  if (isContextCompressMessage(message)) {
    return { role: 'context-compress', content: '' };
  }
  return message as BubbleProps;
};

const showMessages = computed((): BubbleProps[] => {
  let list = messages.value.map((message, index) => {
    if (index === latestCompressIndex.value) {
      return { role: 'zip', content: dividerText.value } as BubbleProps;
    }
    return toShowMessage(message);
  });

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

  const lastMessage = getLastNonCompressMessage(messages.value);

  if (generating.value && lastMessage?.role === 'assistant') {
    const lastIndex = messages.value.indexOf(lastMessage);
    const existingMessages = Array.isArray((lastMessage as any)?.messages) ? (lastMessage as any).messages : [];
    const hasLoadingText = existingMessages.some((msg: any) => msg.type === 'loading-text');

    if (!hasLoadingText && lastIndex !== -1) {
      list = [
        ...list.slice(0, lastIndex),
        {
          ...toShowMessage(lastMessage),
          messages: [
            ...existingMessages,
            {
              type: 'loading-text',
              emitter,
              message: lastMessage,
              showThinkingResult: false,
            },
          ],
        } as BubbleProps,
        ...list.slice(lastIndex + 1),
      ];
    }
  }

  if (showDivider.value && isCompressing.value) {
    list = [...list, { role: 'zip', content: dividerText.value }];
  }

  return list;
});

const clearInputMessage = () => {
  inputMessage.value = '';
  clearComposer();
};

const handleSendMessage = async () => {
  if (isCompressing.value) return;

  const messageContent = inputMessage.value;
  const cardId = generateId();
  schema.setCurrentCardId(cardId);

  const snapshot = templateData.value.slice();
  const hasTags = snapshot.some((item) => item.type === 'template');

  if (hasTags) {
    const composer = getComposerContent(snapshot, selectedNodeMap);
    if (composer.isEmpty) {
      return;
    }
    const userMessage: ChatMessage = {
      role: 'user',
      content: composer.apiContent,
      messageId: cardId,
      messages: [
        {
          type: 'template-user',
          segments: composer.segments,
        },
      ],
    };
    messages.value.push(userMessage);

    if (messages.value.length === 1 && messages.value[0].role === 'user') {
      const currentConversationId = conversation.templateConversationState?.currentId;
      if (currentConversationId) {
        conversation.updateConversationTitle(currentConversationId, segmentsToPlainText(composer.segments).substring(0, 20));
      }
    }

    prevSchema.value = JSON.stringify(schema.currentSchema);
    messageManager.value?.send();
    clearInputMessage();
    scrollToBottom();
    return;
  }

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

const handleNotification = (event: INotificationPayload) => {
  if (event.type !== 'done') {
    return;
  }

  const cardId =
    schema.currentCardId
    || findLatestPendingSchemaCard(messages.value)?.cardId
    || '';
  const card = cardId ? findSchemaCardByCardId(messages.value, cardId) : null;
  let applyFailed = false;
  if (card?.type === 'json-patch') {
    applyFailed = resolveJsonPatchApplyFailed(card, messages.value);
    setJsonPatchApplyResult(applyFailed ? 'failed' : 'success', messages.value, cardId);
  }
  const preview = schema.currentPreviewSchema;
  if (preview && !applyFailed) {
    generateIdForComponents(preview);
  }
  schema.setCurrentSchema(preview);
  finalizePendingSchemaCard(messages.value, {
    cardId: cardId || undefined,
    ...(applyFailed || !preview ? {} : { schema: preview }),
    prevSchema: prevSchema.value || '',
  });
};

watch(() => messages.value, throttledScrollToBottom, { deep: true });

onMounted(() => {
  emitter.on('notification', handleNotification);
  schemaDevMode?.registerComposer({
    insertTag: insertComposerTag,
    getContent: () => getComposerContent(templateData.value, selectedNodeMap),
    clear: clearComposer,
  });
});

onUnmounted(() => {
  emitter.off('notification', handleNotification);
  schemaDevMode?.registerComposer(null);
});
</script>

<template>
  <div class="tg-chat-container" :class="{ 'dark': TinyGenuiConfig?.theme === 'dark' }">
    <div class="messages-container" ref="messagesContainer">
      <tr-bubble-provider v-if="showMessages.length" :content-renderers="messageRenderers">
        <tr-bubble-list :items="showMessages" :roles="roles" auto-scroll> </tr-bubble-list>
      </tr-bubble-provider>
      <div v-else class="empty">
        <IconAi />
        <span>{{ t('app.emptyTitle') }}</span>
      </div>
    </div>
    <div class="sender-container">
      <div
        :class="['scroll-to-bottom-button', { 'is-generating': generating }]"
        v-show="!isLastMessageInBottom"
        @click="scrollToBottom"
      >
        <IconArrowDown class="icon-arrow-down" />
      </div>
      <!-- 会话压缩按钮 -->
      <div class="sender-tool-buttons">
        <TinyButton round class="zip-button" :disabled="isButtonDisabled" :loading="isCompressing" @click="compress">
          会话压缩
        </TinyButton>
      </div>
      <tr-sender
        v-model="inputMessage"
        :template-data="templateData"
        :placeholder="generating || isCompressing ? t('loading.thinking') : t('template.inputPlaceholder')"
        :clearable="true"
        :loading="generating || isCompressing"
        :showWordLimit="true"
        :maxLength="20000"
        @update:template-data="handleTemplateDataUpdate"
        @clear="clearInputMessage"
        @submit="handleSendMessage"
        @cancel="() => (isCompressing ? resetContextZip() : messageManager?.abortRequest())"
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

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 80%;
  font-size: 32px;
  font-weight: 600;

  & > svg {
    width: 56px;
    height: 56px;
  }
}

@media (max-width: 768px) {
  .empty {
    font-size: 24px;

    & > svg {
      width: 48px;
      height: 48px;
    }
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

:deep(.tr-bubble__content-wrapper:not(:has(.context-zip-divider))) {
  @avatar-and-gap-width: 56px;
  max-width: calc(100% - @avatar-and-gap-width * 2);

  .tr-bubble__content {
    max-width: 100%;
  }

  .tr-bubble__content-items {
    overflow-x: auto;
  }
}

// 压缩分割线：由 messages → showMessages 注入 role: zip，撑满列表行宽
:deep(.tr-bubble-list > .tr-bubble:has(.context-zip-divider)) {
  width: 100% !important;
  max-width: 100% !important;
  --max-width: 100%;
  margin-left: 0 !important;
  align-self: stretch;
  gap: 0 !important;
}

:deep(.tr-bubble:has(.context-zip-divider)) {
  .tr-bubble__avatar {
    display: none !important;
    width: 0 !important;
    min-width: 0 !important;
    overflow: hidden;
  }

  .tr-bubble__content-wrapper {
    flex: 1 1 100% !important;
    width: 100% !important;
    max-width: 100% !important;
    align-items: stretch !important;
    margin: 16px 0;
  }

  .tr-bubble__content {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0;
    background: transparent;
    box-shadow: none;
  }
}

:deep(.context-zip-divider) {
  display: grid !important;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  font-size: 12px;
  color: #999;
  user-select: none;

  &__line {
    height: 1px;
    background: var(--sender-border-color, #e5e5e5);
  }

  &__text {
    white-space: nowrap;
  }
}

@media (max-width: 768px) {
  :deep(.tr-bubble__content-wrapper:not(:has(.context-zip-divider))) {
    max-width: calc(100% - 12px);
  }

  :deep(.tr-bubble__content-wrapper:not(:has(.context-zip-divider)) .tr-bubble__content-items) {
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

  .sender-tool-buttons {
    display: flex;
    width: 80%;
    justify-content: flex-end;
    margin: 0 auto;
    margin-bottom: 8px;
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
