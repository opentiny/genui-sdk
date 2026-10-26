<script setup lang="ts">
import '@opentiny/tiny-robot/dist/style.css';
import {
  BubbleRenderers,
  Sender,
  TrBubbleList,
  TrBubbleProvider,
  TrSender,
  UploadButton,
  type BubbleMessage,
  type BubbleRoleConfig,
  type TemplateItem,
} from '@opentiny/tiny-robot';
import {
  useConversation,
  type ChatMessage,
  type UseConversationReturn,
  type UseMessageReturn,
} from '@opentiny/tiny-robot-kit';
import { IconAi, IconArrowDown, IconUser } from '@opentiny/tiny-robot-svgs';
import {
  computed,
  defineComponent,
  h,
  inject,
  markRaw,
  nextTick,
  ref,
  watch,
  type Component,
  type Ref,
} from 'vue';
import type { IMessageItem, IStreamData } from '@opentiny/genui-sdk-core';
import { GenuiRenderer, type IRendererProps } from '../renderer';
import { GENUI_CONFIG } from '../config-provider/injection-tokens';
import AttachmentsRenderer from './renderer/AttachmentsRenderer.vue';
import ErrorText from './ErrorText.vue';
import GeneratingComponent from './GeneratingComponent.vue';
import ReasoningRenderer from './renderer/ReasoningRenderer.vue';
import TemplateDataRenderer from './renderer/TemplateDataRenderer.vue';
import ToolRenderer from './renderer/ToolRenderer.vue';
import { createGenuiResponseProvider } from './CustomModelProvider';
import {
  createResponseHandlerController,
  createResponseHandlerPlugin,
  defaultResponseHandlers,
  type IResponseHandler,
} from './response-handler';
import {
  applyStreamingPlaceholders,
  filterBubbleMessagesForThinkingDisplay,
  buildSenderUserMessage,
  createContentRendererMatches,
  getResolvedContent,
  getResolvedContentText,
  isGroupedFooterFinished,
  resolveBubbleContents,
} from './bubble-protocol';
import {
  createConversationStorage,
  createToggleableConversationStorage,
  flushConversationStorage,
} from './conversation-storage';
import { type FileMeta, MIME_TYPE_MAP } from './file-upload/file-utils';
import { useFileUpload } from './useFileUpload';
import { useI18n } from './i18n';
import { cardIdSymbol } from './useChat';
import { emitter } from './event-emitter';
import { scrollEnd, throttle, toSlotFunction } from './chat-utils';
import { useChatAction } from './continue-chat-action';
import { useResize } from './composable/use-resize';
import type { IBubbleSlotsProps, IChatProps, ICustomActionItem, IRolesConfig } from './chat.types';

const props = withDefaults(defineProps<IChatProps>(), {
  autoSaveMessages: true,
});

const genuiConfig = inject(GENUI_CONFIG, null);
const { t } = useI18n();
const slots = defineSlots<{
  empty?: () => any;
  prefix?: (props: IBubbleSlotsProps) => any;
  suffix?: (props: IBubbleSlotsProps) => any;
  after?: (props: IBubbleSlotsProps) => any;
  'content-footer'?: (props: IBubbleSlotsProps) => any;
}>();
const inputMessage = ref('');
type TrSenderExpose = {
  clear?: () => void;
  setContent?: (content: string) => void;
};
const senderRef = ref<TrSenderExpose | null>(null);
const responseHandlers: Ref<IResponseHandler<IStreamData>[]> = ref(defaultResponseHandlers);

const customComponentsMap = computed(() =>
  Object.fromEntries(
    (props.customComponents ?? [])
      .filter((item) => item.ref && item.component)
      .map((item) => [item.component, item.ref]),
  ),
);
const customActionsMap = computed<Record<string, ICustomActionItem>>(() =>
  Object.fromEntries((props.customActions ?? []).filter((item) => item.name).map((item) => [item.name, item])),
);

const autoSaveEnabled = computed(() => props.autoSaveMessages);
const baseStorage = props.conversationStorage ?? createConversationStorage();
const storage = createToggleableConversationStorage(baseStorage, autoSaveEnabled);

const responseProvider = createGenuiResponseProvider({
  getChatOptions: () => ({
    url: props.url ?? '',
    model: props.model ?? '',
    temperature: props.temperature ?? 0.3,
    chatConfig: props.chatConfig ?? { addToolCallContext: false, showThinkingResult: false },
    customComponents: props.customComponents ?? [],
    customSnippets: props.customSnippets ?? [],
    customExamples: props.customExamples ?? [],
    customActions: [...(props.customActions ?? []), continueChatAction, saveStateAction],
    customFetch: props.customFetch,
  }),
});

const responseController = createResponseHandlerController({
  getHandlers: () => responseHandlers.value,
  getChatConfig: () => props.chatConfig ?? { addToolCallContext: false, showThinkingResult: false },
});

let conversation!: UseConversationReturn;
let initialMessagesApplied = false;

const applyInitialMessages = () => {
  const engine = conversation.activeConversation.value?.engine;
  if (!engine || initialMessagesApplied || !props.messages?.length) return;
  engine.messages.value.splice(0, engine.messages.value.length, ...(props.messages as ChatMessage[]));
  initialMessagesApplied = true;
};

conversation = useConversation({
  storage,
  autoSaveMessages: true,
  useMessageOptions: {
    responseProvider,
    requestMessageFieldsExclude: ['state', 'metadata', 'loading', 'messages', 'finishInfo', 'originChatMessage'],
    plugins: [createResponseHandlerPlugin(responseController)],
    onCompletionChunk(context) {
      responseController.handleChunk(context.turnId, context.currentMessage, context.chunk as IStreamData);
    },
  },
  onLoad(conversations) {
    queueMicrotask(async () => {
      if (conversations.length) {
        await conversation.switchConversation(conversations[0].id);
      } else {
        conversation.createConversation({ title: t('conversation.newConversation') });
      }
      applyInitialMessages();
    });
  },
});

const messageEngine = computed<UseMessageReturn | null>(() => conversation.activeConversation.value?.engine ?? null);
const messages = computed<ChatMessage[]>(() => messageEngine.value?.messages.value ?? []);
const generating = computed(() => messageEngine.value?.isProcessing.value ?? false);

watch(
  autoSaveEnabled,
  async (enabled, previous) => {
    if (!enabled || previous !== false) return;
    const active = conversation.activeConversation.value;
    await flushConversationStorage(
      baseStorage,
      conversation.conversations.value,
      active ? { id: active.id, messages: active.engine.messages.value } : null,
    );
  },
);

const defaultRoleConfigs: IRolesConfig = {
  assistant: {
    placement: 'start',
    avatar: h(IconAi, { style: { fontSize: '32px' } }),
  },
  user: {
    placement: 'end',
    avatar: h(IconUser, { style: { fontSize: '32px' } }),
  },
};
const roleConfigs = computed<Record<string, BubbleRoleConfig>>(() => ({
  assistant: { ...defaultRoleConfigs.assistant, ...props.roleConfigs?.assistant },
  user: { ...defaultRoleConfigs.user, ...props.roleConfigs?.user },
}));

const wrapContentRenderer = (renderer: Component) =>
  markRaw(
    defineComponent({
      name: 'GenuiBubbleContentAdapter',
      props: {
        message: { type: Object, required: true },
        contentIndex: { type: Number, required: true },
      },
      setup(rendererProps) {
        return () => h(renderer, getResolvedContent(rendererProps));
      },
    }),
  );

const lastSchemaCardId = computed(() => {
  const last = messages.value.at(-1) as (ChatMessage & { messages?: IMessageItem[] }) | undefined;
  return last?.role === 'assistant' && last.messages?.length ? (last.messages.at(-1) as any)?.id : null;
});

const SchemaCardContentRenderer = markRaw(
  defineComponent({
    name: 'GenuiSchemaCardContentRenderer',
    props: {
      message: { type: Object, required: true },
      contentIndex: { type: Number, required: true },
    },
    setup(rendererProps) {
      return () => {
        const item = getResolvedContent(rendererProps) as IRendererProps;
        return h(
          GenuiRenderer,
          {
            ...item,
            requiredCompleteFieldSelectors: props.requiredCompleteFieldSelectors ?? [],
            generating: generating.value && lastSchemaCardId.value === item.id,
            customComponents: customComponentsMap.value,
            customActions: {
              ...customActionsMap.value,
              continueChat: continueChatAction,
              saveState: saveStateAction,
            },
            key: item.id,
          },
          {
            header: toSlotFunction(props.rendererSlots?.header),
            footer: toSlotFunction(props.rendererSlots?.footer),
          },
        );
      };
    },
  }),
);

const CustomTextRenderer = markRaw(
  defineComponent({
    props: {
      message: { type: Object, required: true },
      contentIndex: { type: Number, required: true },
    },
    setup(rendererProps) {
      return () =>
        h(
          'span',
          { class: 'tr-bubble__body-text' },
          getResolvedContentText(getResolvedContent(rendererProps) as { content?: unknown; text?: unknown }),
        );
    },
  }),
);

const MarkdownContentRenderer = markRaw(
  defineComponent({
    name: 'GenuiMarkdownContentRenderer',
    props: {
      message: { type: Object, required: true },
      contentIndex: { type: Number, required: true },
    },
    setup(rendererProps) {
      return () => {
        const text = getResolvedContentText(getResolvedContent(rendererProps) as { content?: unknown; text?: unknown });
        // TinyRobot Markdown reads `message.content` via provider resolver, not GenUI `messages[]` items.
        return h(BubbleRenderers.Markdown, {
          message: { role: 'assistant', content: text },
          contentIndex: 0,
        });
      };
    },
  }),
);

const messageRenderers = ref<Record<string, Component>>({
  'custom-text': CustomTextRenderer,
  'schema-card': SchemaCardContentRenderer,
  tool: wrapContentRenderer(ToolRenderer),
  reasoning: wrapContentRenderer(ReasoningRenderer),
  markdown: MarkdownContentRenderer,
  templateData: wrapContentRenderer(TemplateDataRenderer),
  'loading-text': wrapContentRenderer(props.thinkComponent ?? GeneratingComponent),
  'error-text': wrapContentRenderer(ErrorText),
});

const contentRendererMatches = computed(() => createContentRendererMatches(messageRenderers.value));

const resolvedBubbleSlots = computed(() => {
  const result: Record<string, (slotProps: any) => any> = {};
  for (const name of ['prefix', 'suffix', 'after', 'content-footer'] as const) {
    const slot = props.bubbleSlots?.[name] ?? slots[name];
    if (!slot) continue;
    result[name] = (slotProps: any) => {
      const engine = messageEngine.value;
      if (!engine) return null;
      const enriched: IBubbleSlotsProps = {
        ...slotProps,
        isFinished: isGroupedFooterFinished({
          role: slotProps.role,
          messageIndexes: slotProps.messageIndexes,
          messagesLength: messages.value.length,
          generating: generating.value,
        }),
        messageEngine: engine,
        conversation,
      };
      return slot(enriched);
    };
  }
  return result;
});

const BubbleListWithSlots = defineComponent({
  name: 'GenuiBubbleListWithSlots',
  props: {
    bubbleMessages: { type: Array, required: true },
  },
  setup(listProps) {
    return () =>
      h(
        TrBubbleList,
        {
          messages: listProps.bubbleMessages as BubbleMessage[],
          roleConfigs: roleConfigs.value,
          contentResolver: resolveBubbleContents,
          autoScroll: true,
        },
        resolvedBubbleSlots.value,
      );
  },
});

const flatAllMessages = (items: ChatMessage[]) =>
  items.flatMap((item) =>
    item.role === 'assistant' && Array.isArray((item as any).messages) ? (item as any).messages : [],
  ) as IMessageItem[];
const getCardMessage = (cardId: string) =>
  flatAllMessages(messages.value).find((item) => (item as any).id === cardId);

const saveState = (context: Record<string | symbol, any>) => {
  const cardMessage = getCardMessage(context[cardIdSymbol]);
  if (cardMessage) {
    (cardMessage as any).state = structuredClone(context.state ?? {});
  }
};

const chat = ({ llmFriendlyMessage, humanFriendlyMessage, context }: any) => {
  saveState(context);
  return messageEngine.value?.send({
    role: 'user',
    content: llmFriendlyMessage,
    messages: [{ type: 'text', content: humanFriendlyMessage }],
  } as ChatMessage);
};
const { continueChatAction, saveStateAction } = useChatAction({ chat, saveState });

const setInputMessage = (message: string) => {
  inputMessage.value = message;
  void nextTick(() => {
    senderRef.value?.setContent?.(message);
  });
};

const { attachments, templateData, clearAttachments, processAttachments, handleFilesSelected } = useFileUpload();
const senderExtensions = [Sender.Template.configure({ items: templateData })];

/** Sync attachment/template refs after the editor was cleared (do not call TrSender.clear here — it re-emits `clear`). */
const syncSenderExternalState = () => {
  templateData.value = [];
  clearAttachments();
  inputMessage.value = '';
};

const handleSenderClear = () => {
  syncSenderExternalState();
};

const clearInputAfterSend = () => {
  // Template extension watches `templateData` and runs setTemplateData → clearContent().
  syncSenderExternalState();
};

const handleRemoveAttachment = (item?: FileMeta) => {
  if (!item) return;
  attachments.value = attachments.value.filter((attachment) => attachment.name !== item.name);
  templateData.value = templateData.value.filter((data) => data.type !== 'block' || data.content !== item.name);
};

const handleSendMessage = async (text: string, structuredData?: TemplateItem[]) => {
  const engine = messageEngine.value;
  if (!engine?.canStartTurn.value) return;

  const normalizedText = typeof text === 'string' ? text.trim() : '';
  const data = Array.isArray(structuredData) ? structuredData : templateData.value;
  const attachmentsSnapshot = attachments.value.slice();
  if (!normalizedText && attachmentsSnapshot.length === 0) return;

  let apiContent: any[] | undefined;
  if (attachmentsSnapshot.length) {
    const result = await processAttachments(attachmentsSnapshot, props.features ?? {});
    if (!result) return;
    apiContent = result.apiContent;
  }
  const userMessage = buildSenderUserMessage({
    text: normalizedText,
    structuredData: data,
    attachments: attachmentsSnapshot,
    apiContent,
  });

  const active = conversation.activeConversation.value;
  if (active && messages.value.length === 0) {
    conversation.updateConversationTitle(active.id, normalizedText.substring(0, 20));
  }

  // send() enqueues the user message synchronously before its first await; clear only after that.
  const sendTask = engine.send(userMessage);
  clearInputAfterSend();
  await sendTask;
  scrollToBottom();
};

const handleNewConversation = () => {
  conversation.createConversation({ title: t('conversation.newConversation') });
};
const abortRequest = () => conversation.abortActiveRequest();

const showMessages = computed(() => {
  const engine = messageEngine.value;
  const current = filterBubbleMessagesForThinkingDisplay(
    messages.value,
    props.chatConfig?.showThinkingResult,
  );
  const last = current.at(-1) as (ChatMessage & { messages?: IMessageItem[] }) | undefined;
  return applyStreamingPlaceholders(current, {
    generating: generating.value,
    requestState: engine?.requestState.value,
    thinkingText: t('loading.thinking'),
    loadingItem: {
      emitter,
      message: last,
      showThinkingResult: props.chatConfig?.showThinkingResult,
    },
  });
});

const messagesContainer: Ref<HTMLElement | undefined> = ref();
const { width: messagesContainerWidth } = useResize(messagesContainer);
const { scrollToBottom, scrollToBottomWithRetry, autoScrollToBottom, isLastMessageInBottom } =
  scrollEnd(messagesContainer);
const throttledScrollToBottom = throttle(autoScrollToBottom, 400);
watch(messages, throttledScrollToBottom, { deep: true });
watch(
  () => conversation.activeConversationId.value,
  () => scrollToBottomWithRetry(10, 150),
);

const isAllowFiles = computed(() => {
  const supportImage = props.features?.supportImage;
  return !!(supportImage && supportImage.enabled !== false);
});
const uploadAccept = computed(() =>
  props.features?.supportImage?.supportedFileTypes
    ?.map((type) => MIME_TYPE_MAP[type.toLowerCase()])
    .filter(Boolean)
    .join(','),
);

defineExpose({
  setInputMessage,
  handleNewConversation,
  getProps: () => props,
  getConversation: () => conversation,
  getResponseHandlers: () => responseHandlers.value,
  setResponseHandlers: (handlers: IResponseHandler<IStreamData>[]) => {
    responseHandlers.value = handlers;
  },
  getMessageRenderers: () => messageRenderers.value,
  setMessageRenderer: (key: string, renderer: Component) => {
    messageRenderers.value = { ...messageRenderers.value, [key]: wrapContentRenderer(renderer) };
  },
  generating,
  lastSchemaCardId,
  continueChatAction,
  saveStateAction,
});
</script>

<template>
  <div
    class="tg-chat-container"
    :class="{ dark: genuiConfig?.colorScheme === 'dark' }"
    :style="!props.chatConfig?.showThinkingResult ? { '--thinking-display': 'none' } : {}"
  >
    <div
      ref="messagesContainer"
      class="messages-container"
      :style="{ '--messages-container-width': `${messagesContainerWidth}px` }"
    >
      <TrBubbleProvider v-if="showMessages.length" :content-renderer-matches="contentRendererMatches">
        <BubbleListWithSlots :bubble-messages="showMessages" />
      </TrBubbleProvider>
      <slot v-else name="empty" />
    </div>

    <div class="sender-container">
      <button
        v-show="!isLastMessageInBottom"
        type="button"
        :class="['scroll-to-bottom-button', { 'is-generating': generating }]"
        @click="scrollToBottom()"
      >
        <IconArrowDown />
      </button>
      <TrSender
        ref="senderRef"
        v-model="inputMessage"
        mode="multiple"
        :extensions="senderExtensions"
        :placeholder="generating ? t('placeholder.thinking') : t('placeholder.input')"
        clearable
        :loading="generating"
        show-word-limit
        :max-length="20000"
        @clear="handleSenderClear"
        @submit="handleSendMessage"
        @cancel="abortRequest"
      >
        <template v-if="attachments.length" #header>
          <div class="attachments-container">
            <AttachmentsRenderer :attachments="attachments" @remove="handleRemoveAttachment" />
          </div>
        </template>
        <template v-if="isAllowFiles" #footer>
          <UploadButton
            :accept="uploadAccept"
            multiple
            :max-size="props.features?.supportImage?.maxImageSize"
            :max-count="props.features?.supportImage?.maxFilesPerRequest"
            @select="(files) => handleFilesSelected(files, inputMessage)"
          />
        </template>
      </TrSender>
      <div class="footer-text">{{ t('footer.aiGenerated') }}</div>
    </div>
  </div>
</template>

<style scoped lang="less">
.tg-chat-container {
  --ti-gen-chat-container-bg-color: #f0f0f0;
  --thinking-display: initial;
  --sender-bg: url('./assets/sender-light.svg') no-repeat center;
  --sender-border-color: #e5e5e5;
  --generating-bg-before: linear-gradient(90deg, #fff, #a2c7f4);
  --generating-bg-after: #fff;
  box-sizing: border-box;
  height: 100%;
  color: var(--tr-text-primary);
  background-color: var(--ti-gen-chat-container-bg-color);
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

:deep(.tr-bubble[data-placement='start'] .tr-bubble__content) {
  padding: 0;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  gap: 16px;
}

/* 1.0 同一条 assistant 消息的 tool / markdown / card 都在单个 .tr-bubble__box 内，兄弟 margin 不生效 */
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

/* schema 白底只在 TinyCard（内容组件）上；surface/container 透明，避免整圈 bubble padding 白边 */
:deep(
  .tr-bubble[data-role='assistant'][data-placement='start']
    .tr-bubble__content
    > .tr-bubble__box
    .schema-render-surface
) {
  width: 100%;
  background: transparent;
  padding: 0;
  border: none;
  box-shadow: none;
}

:deep(
  .tr-bubble[data-role='assistant'][data-placement='start']
    .tr-bubble__content
    > .tr-bubble__box
    .schema-render-surface
    .tiny-card.tiny-card
) {
  width: 100%;
  box-sizing: border-box;
  background-color: var(--tr-bubble-box-bg);
  border-radius: var(--tr-bubble-box-shape-rounded-radius);
  box-shadow: var(--tr-bubble-box-shadow);
  border: var(--tr-bubble-box-border);
}

:deep(.tr-bubble__step-tool + .tr-bubble__step-tool) {
  margin-top: 16px;
}

:deep(.tr-bubble[data-placement='end']) {
  width: 100%;
}

:deep(.tr-bubble__content) {
  max-width: calc(100% - var(--ti-gen-chat-avatar-and-gap-width, 56px) * 2);
  overflow-x: auto;
}

:deep(.tr-bubble[data-role='assistant'] .tr-bubble__step-tool),
:deep(.tr-bubble[data-role='assistant'] .tr-bubble__reasoning) {
  display: var(--thinking-display, initial);
}

:deep(.tr-bubble[data-role='assistant'] .tr-bubble__content-items:has([type^='schema-card'])) {
  > [type]:not([type='']):not([type='schema-card']):not([type='loading-text']) {
    display: var(--thinking-display, initial);
  }
}

:deep(.tr-bubble[data-role='assistant'] [data-content-index]:has([type^='schema-card'])) {
  > [type]:not([type='schema-card']):not([type='loading-text']) {
    display: var(--thinking-display, initial);
  }
}

.sender-container {
  position: relative;
  flex-shrink: 0;
  padding: 16px 0;
  background: var(--sender-bg);
}

.attachments-container {
  padding: 0 20px;
}

.scroll-to-bottom-button {
  position: absolute;
  left: 50%;
  top: -35px;
  z-index: 1000;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  transform: translateX(-50%);
  cursor: pointer;
  border: 1px solid var(--sender-border-color);
  border-radius: 50%;
  background-color: var(--generating-bg-after);

  svg {
    width: 20px;
    height: 20px;
  }
}

.footer-text {
  margin-top: 16px;
  color: #999;
  font-size: 12px;
  text-align: center;
}

:deep(.schema-render-container) {
  min-width: min(calc(var(--messages-container-width) - 250px), 400px);
}

:deep(.tr-sender) {
  width: 80%;
  max-width: 100%;
  margin: 0 auto;
}
</style>
