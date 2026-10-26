<script setup lang="ts">
import { ref, watch, computed, reactive, h, inject, markRaw, defineComponent, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';
import '@opentiny/tiny-robot/dist/style.css';
import {
  TrBubbleList,
  TrSender,
  TrBubbleProvider,
  useTheme,
  BubbleRenderers,
  Sender,
  type BubbleContentRendererProps,
  type BubbleMessage,
  type BubbleRoleConfig,
  type TemplateItem,
} from '@opentiny/tiny-robot';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import { IconAi, IconUser, IconArrowDown } from '@opentiny/tiny-robot-svgs';
import {
  scrollEnd,
  throttle,
  GENUI_CONFIG,
  createContentRendererMatches,
  getResolvedContentText,
  resolveBubbleContents,
} from '@opentiny/genui-sdk-vue';
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
  findLatestPendingSchemaCard,
  findSchemaCardByCardId,
  getLastUserMessage,
  isManualSchemaSaveMessage,
  resolveJsonPatchApplyFailed,
  setJsonPatchApplyResult,
} from './template-chat-utils';
import { finalizeSchemaPreview } from './finalize-schema-preview';
import { generateId } from '../../utils';
import { getComposerContent, segmentsToPlainText } from './schema-composer';
import type { SelectedSchemaNode } from './schema-node-selection';
import TemplateUserMessageRenderer from './TemplateUserMessageRenderer.vue';
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

const route = useRoute();
const TinyGenuiConfig: any = inject(GENUI_CONFIG, null);
const { setColorMode } = useTheme();
const prevSchema = ref<string>('');
const { schema, conversation, versionControl, stream, emitter } = useTemplateContext();
const selectedNodeMap = new Map<string, SelectedSchemaNode>();

const composerDrafts = reactive(new Map<string, { items: TemplateItem[] }>());
const currentComposerDraft = computed(() => {
  const id = conversation.currentConversationId;
  if (!id) {
    return null;
  }
  let draft = composerDrafts.get(id);
  if (!draft) {
    draft = { items: [] };
    composerDrafts.set(id, draft);
    draft = composerDrafts.get(id)!;
  }
  return draft;
});
const templateData = computed({
  get: () => currentComposerDraft.value?.items ?? [],
  set: (value: TemplateItem[]) => {
    const draft = currentComposerDraft.value;
    if (draft) {
      draft.items = value;
    }
  },
});
const senderExtensions = [Sender.Template.configure({ items: templateData })];

const {
  handleSchemaJsonChanged,
  resetLastPreviewSchema,
} = stream;

watch(
  () => TinyGenuiConfig?.value?.colorScheme,
  (colorScheme) => {
    setColorMode(colorScheme === 'dark' ? 'dark' : 'light');
  },
  {
    immediate: true,
  },
);

const messageEngine = computed(() => conversation.getMessageEngine());
const inputMessage = ref('');

let inputMessageFromQueryApplied = false;
watch(
  () => ({
    queryMessage: route.query['input-message'],
    manager: messageEngine.value,
    loading: conversation.templateConversationState?.loading,
  }),
  ({ queryMessage, manager, loading }) => {
    if (inputMessageFromQueryApplied) {
      return;
    }
    if (typeof queryMessage !== 'string' || !queryMessage || !manager || loading) {
      return;
    }
    inputMessage.value = queryMessage;
    inputMessageFromQueryApplied = true;
  },
  { immediate: true },
);

const messages = computed(() => messageEngine.value?.messages.value ?? []);
const generating = computed(() => messageEngine.value?.isProcessing.value ?? false);

const messagesContainer: Ref<HTMLElement | undefined> = ref();

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

const handleRefresh = ({ messageIndexes }: { messageIndexes: number[] }) => {
  const index = messageIndexes.at(-1) ?? -1;
  if (!messageEngine.value) {
    return;
  }
  const { messages, send } = messageEngine.value;
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

const handleCopy = async ({ messageIndexes }: { messageIndexes: number[] }) => {
  const index = messageIndexes.at(-1) ?? -1;
  try {
    await copy((messages.value[index]?.content as string) || '');
  } catch (error) {
    console.error('复制失败', error);
  }
};

const getResolvedContent = (rendererProps: BubbleContentRendererProps) => {
  const resolved = resolveBubbleContents(rendererProps.message as BubbleMessage);
  if (Array.isArray(resolved)) {
    return (resolved[rendererProps.contentIndex] ?? {}) as Record<string, any>;
  }
  if (rendererProps.contentIndex === 0 && typeof resolved === 'string') {
    return { type: 'text', text: resolved, content: resolved };
  }
  return {};
};

const MarkdownContentRenderer = markRaw(
  defineComponent({
    name: 'TemplateMarkdownContentRenderer',
    props: {
      message: { type: Object, required: true },
      contentIndex: { type: Number, required: true },
    },
    setup(rendererProps) {
      return () => {
        const text = getResolvedContentText(getResolvedContent(rendererProps as BubbleContentRendererProps));
        return h(BubbleRenderers.Markdown, {
          message: { role: 'assistant', content: text },
          contentIndex: 0,
        });
      };
    },
  }),
);

const wrapRenderer = (render: (content: Record<string, any>) => any) =>
  markRaw(
    defineComponent({
      props: {
        message: { type: Object, required: true },
        contentIndex: { type: Number, required: true },
      },
      setup(rendererProps) {
        return () => render(getResolvedContent(rendererProps as any));
      },
    }),
  );

const createSchemaMessageRenderer = (type: 'json-patch' | 'schema-card' | 'schema-manual') =>
  wrapRenderer((content) =>
    h(TemplateSchemaMessageRenderer, {
      itemProps: content,
      type,
      prevSchema: prevSchema.value,
    }),
  );

const messageRenderers = {
  markdown: MarkdownContentRenderer,
  'template-user': wrapRenderer((content) =>
    h(TemplateUserMessageRenderer, {
      segments: content.segments,
      content: content.content,
    }),
  ),
  'json-patch': createSchemaMessageRenderer('json-patch'),
  'schema-card': createSchemaMessageRenderer('schema-card'),
  'schema-manual': createSchemaMessageRenderer('schema-manual'),
};

const contentRendererMatches = createContentRendererMatches(messageRenderers);
const contentResolver = (message: BubbleMessage) => resolveBubbleContents(message);

const SCHEMA_CARD_TYPES = new Set(['schema-card', 'json-patch', 'schema-manual']);

function hideMarkdownWhenSchemaCardPresent(list: typeof messages.value) {
  return list.map((message) => {
    if (message.role !== 'assistant') {
      return message;
    }
    const withItems = message as typeof message & { messages?: IMessageItem[] };
    const items = withItems.messages;
    if (!Array.isArray(items) || items.length === 0) {
      return message;
    }
    const hasSchemaCard = items.some((item) => SCHEMA_CARD_TYPES.has(item.type));
    if (!hasSchemaCard) {
      return message;
    }
    const filtered = items.filter(
      (item) => item.type !== 'markdown' && item.type !== 'text' && item.type !== 'custom-text',
    );
    if (filtered.length === items.length) {
      return message;
    }
    return { ...withItems, messages: filtered };
  });
}

const bubbleSlots = {
  after: (slotProps: { messages: BubbleMessage[]; messageIndexes: number[]; role?: string }) => {
    if (slotProps.role !== 'assistant' || !messageEngine.value || !conversation.conversationKit) return null;
    const index = slotProps.messageIndexes.at(-1) ?? -1;
    const chatMessage = messageEngine.value.messages.value[index];
    if (!chatMessage || isManualSchemaSaveMessage(chatMessage)) return null;
    return h(AssistantFooter, {
      ...slotProps,
      isFinished: index !== messages.value.length - 1 || !generating.value,
      messageEngine: messageEngine.value,
      conversation: conversation.conversationKit,
      onRefresh: handleRefresh,
      onCopy: handleCopy,
    });
  },
};

// 版本切换后已点选标签指向旧 schema 节点，剥除标签项（保留文字草稿）
const clearComposerTags = () => {
  const draft = currentComposerDraft.value;
  if (draft?.items.length) {
    draft.items = draft.items.filter((item) => item.type !== 'block');
  }
};

const insertComposerTag = (node: SelectedSchemaNode) => {
  const draft = currentComposerDraft.value;
  if (!draft) {
    return;
  }
  // 去掉空文本项：TrSender 对「空 text + template」边界会把空 text 复制一份，导致重复 key 警告
  let items = draft.items.filter((item) => item.type !== 'text' || Boolean(item.content));
  if (
    !items.some((item) => item.type === 'text') &&
    !items.some((item) => item.type === 'block') &&
    inputMessage.value
  ) {
    items = [{ type: 'text', content: inputMessage.value }, ...items];
  }
  const id = generateId();
  selectedNodeMap.set(id, node);
  draft.items = [...items, { type: 'block', content: node.componentName, id }];
};

const SENDER_MAX_LENGTH = 20000;

const clearComposer = () => {
  const draft = currentComposerDraft.value;
  if (draft) {
    draft.items = [];
  }
};

defineExpose({ insertComposerTag, clearComposer, clearComposerTags });

if (props.messages?.length) {
  messages.value.splice(0, messages.value.length, ...(props.messages as any));
}

const { scrollToBottom, autoScrollToBottom, isLastMessageInBottom } = scrollEnd(messagesContainer);
const throttledScrollToBottom = throttle(autoScrollToBottom, 400);

const showMessages = computed(() => {
  let list = hideMarkdownWhenSchemaCardPresent(messages.value);

  if (messageEngine.value?.requestState.value === 'processing' && list.at(-1)?.role === 'user') {
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
  clearComposer();
};

const handleSendMessage = async () => {
  const draft = currentComposerDraft.value;
  const snapshot: TemplateItem[] = draft?.items.length
    ? draft.items
    : inputMessage.value
      ? [{ type: 'text', content: inputMessage.value }]
      : [];
  const composer = getComposerContent(snapshot, selectedNodeMap);
  if (composer.isEmpty || composer.textLength > SENDER_MAX_LENGTH) {
    return;
  }

  const cardId = generateId();
  schema.setCurrentCardId(cardId);

  const hasTags = composer.segments.some((segment) => segment.type === 'node');
  const userMessage: ChatMessage = {
    role: 'user',
    content: composer.apiContent,
    messageId: cardId,
    ...(hasTags
      ? {
          messages: [
            {
              type: 'template-user',
              segments: composer.segments,
            },
          ],
        }
      : {}),
  };
  const isFirstMessage = messages.value.length === 0;
  if (isFirstMessage) {
    const currentConversationId = conversation.templateConversationState?.currentId;
    if (currentConversationId) {
      conversation.updateConversationTitle(currentConversationId, segmentsToPlainText(composer.segments).substring(0, 20));
    }
  }

  prevSchema.value = JSON.stringify(schema.currentSchema);
  await messageEngine.value?.send(userMessage);
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
  let preview = schema.currentPreviewSchema;
  if (preview && !applyFailed) {
    preview = finalizeSchemaPreview(preview, schema);
  } else {
    schema.setCurrentSchema(preview);
  }
  finalizePendingSchemaCard(messages.value, {
    cardId: cardId || undefined,
    ...(applyFailed || !preview ? {} : { schema: preview }),
    prevSchema: prevSchema.value || '',
  });
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
  <div class="tg-chat-container" :class="{ 'dark': TinyGenuiConfig?.colorScheme === 'dark' }">
    <div class="messages-container" ref="messagesContainer">
      <tr-bubble-provider v-if="showMessages.length" :content-renderer-matches="contentRendererMatches">
        <tr-bubble-list
          :messages="showMessages"
          :role-configs="roleConfigs"
          :content-resolver="contentResolver"
          auto-scroll
          v-slots="bubbleSlots"
        />
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
      <tr-sender
        v-model="inputMessage"
        :extensions="senderExtensions"
        :placeholder="generating ? t('loading.thinking') : t('template.inputPlaceholder')"
        :clearable="true"
        :loading="generating"
        :showWordLimit="true"
        :maxLength="SENDER_MAX_LENGTH"
        @clear="clearInputMessage"
        @submit="handleSendMessage"
        @cancel="() => messageEngine?.abortRequest()"
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

:deep(.editor-container [data-type='block']) {
  white-space: nowrap;
}

:deep(.tr-bubble[data-placement='start'] .tr-bubble__content) {
  padding: 0;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  gap: 16px;
}

:deep(.tr-bubble[data-role='assistant'][data-placement='start'] .tr-bubble__content > .tr-bubble__box) {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  overflow: visible;
}

:deep(.tr-bubble[data-role='assistant'] .tr-bubble__step-tool),
:deep(.tr-bubble[data-role='assistant'] .tr-bubble__reasoning) {
  display: var(--thinking-display, initial);
}

:deep(.tr-bubble[data-role='assistant'] .tr-bubble__content-items:has(.schema-version-card)),
:deep(.tr-bubble[data-role='assistant'] [data-content-index]:has(.schema-version-card)) {
  > [type]:not([type='schema-card']):not([type='schema-manual']):not([type='loading-text']) {
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
}

:deep(.tr-bubble__content) {
  max-width: calc(100% - var(--ti-gen-chat-avatar-and-gap-width, 56px) * 2);
  overflow-x: auto;
}

@media (max-width: 768px) {
  :deep(.tr-bubble__body) {
    max-width: calc(100% - 12px);
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

:deep(.tr-sender) {
  width: 80%;
  max-width: 100%;
  margin: 0 auto;
}

.footer-text {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 16px;
}
</style>
