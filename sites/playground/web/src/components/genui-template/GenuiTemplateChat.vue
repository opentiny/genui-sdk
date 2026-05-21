<script setup lang="ts">
import { ref, watch, computed, h, inject, onMounted, onUnmounted, toRaw } from 'vue';
import type { Ref } from 'vue';
import '@opentiny/tiny-robot/dist/style.css';
import * as jsonPatchFormatter from 'jsondiffpatch/formatters/jsonpatch';
import type { JsonPatchOp } from 'jsondiffpatch/formatters/jsonpatch-apply';
import { DeltaPatcher, type IChatMessage } from '@opentiny/genui-sdk-core';
import {
  TrBubbleList,
  TrSender,
  TrBubbleProvider,
  useTheme,
  BubbleMarkdownContentRenderer,
} from '@opentiny/tiny-robot';
import { GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import { IconAi, IconUser, IconArrowDown } from '@opentiny/tiny-robot-svgs';
import type { BubbleRoleConfig } from '@opentiny/tiny-robot';
import { requiredCompleteFieldSelectors, scrollEnd, throttle, GENUI_CONFIG } from '@opentiny/genui-sdk-vue';
import type { IMessage } from '@opentiny/genui-sdk-vue';
import copy from 'clipboard-copy';
import type { INotificationPayload, IMessageItem, IJsonPatchMessageItem, ISchemaCardMessageItem } from './chat.types';
import {
  textToJson,
  validateJsonPatch,
  PARSE_PARTIAL_JSON_STATE,
  formatJsonPatch,
  generateIdForComponents,
} from './template-chat-utils';
import { formatDate, generateId } from '../../utils';
import useTemplate from './useTemplate';
import AssistantFooter from './TemplateAssistantFooter.vue';
import TemplateSchemaMessageRenderer from './TemplateSchemaMessageRenderer.vue';
import { emitter } from './template-chat-event-emitter';
import useIcon from '../../use-icon';

const { addIcons } = useIcon();
addIcons(IconAi, IconUser, IconArrowDown);

const props = defineProps<{
  messages?: IMessage[];
}>();

const emit = defineEmits(['schema-version-toggle']);

const TinyGenuiConfig: any = inject(GENUI_CONFIG, null);
const { setColorMode } = useTheme();
const prevSchema = ref<string>('');
const errorMessagesMap = ref<Map<string, string>>(new Map());
const {
  conversation,
  templateConversationState,
  currentSchema,
  currentPreviewSchema,
  currentCardId,
  setCurrentSchema,
  setCurrentPreviewSchema,
  updateTemplateTitle,
  setCurrentCardId,
} = useTemplate();

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

const { messageManager } = conversation;

// 当前会话的 messages 代理
const messages = computed(() => messageManager.value.messages.value);

const generating = computed(() => GeneratingStatus.includes(conversation.messageManager.value.messageState.status));

const roles: Record<string, BubbleRoleConfig> = {
  assistant: {
    placement: 'start',
    avatar: h(IconAi, { style: { fontSize: '32px' } }),
    maxWidth: '100%',
    customContentField: 'messages',
    slots: {
      trailer: (slotProps: { bubbleProps: any; index?: number }) => {
        const isFinished =
          slotProps.bubbleProps.role !== 'assistant' ||
          (slotProps.index !== undefined && slotProps.index !== messages.value.length - 1) ||
          !generating.value;
        return h(AssistantFooter, {
          bubbleProps: slotProps.bubbleProps,
          index: slotProps.index,
          isFinished,
          messageManager: messageManager.value,
          chatMessage: (messageManager.value.messages.value[slotProps.index] || {}) as IChatMessage,
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


const handleSchemaJsonChanged = (event: { type: 'schema-card' | 'json-patch', cardId: string, content: string, delta: any, newMessage: boolean }) => {
  const { type, cardId, content, newMessage } = event;
  if (type === 'schema-card') {
    schemaCardRenderer({ content, cardId, newMessage });
  } else if (type === 'json-patch') {
    jsonPatchRenderer({ content, cardId, newMessage });
  }
};
onMounted(() => {
  emitter.on('schema-json-changed', handleSchemaJsonChanged);
});
onUnmounted(() => {
  emitter.off('schema-json-changed', handleSchemaJsonChanged);
});

const lastPreviewSchema = ref<any>(null);
// const lastOperationIndex = ref<number>(-1); // TODO: 追踪已执行的index，减少重复执行

const deltaPatcher = new DeltaPatcher({
  requiredCompleteFieldSelectors,
});

const schemaCardRenderer = async (props: any) => {
  try {
    const { content, cardId } = props;

    if (cardId !== currentCardId.value) {
      return;
    }

    let json = null;
    let isCompleted = true;
    let target = {};
    if (typeof content === 'string' && content) {
      const { value, state } = await textToJson(content);
      isCompleted = state === PARSE_PARTIAL_JSON_STATE.SUCCESSFUL_PARSE;
      if (!value) {
        return;
      }
      json = value;
    }
    deltaPatcher.patchWithDelta(target, json, isCompleted);
    // 给每个组件添加 id
    const schemaWithId = generateIdForComponents(target); // TODO: 流式渲染过程中，ID一直在刷新，会影响到渲染diff性能，需要设计稳定的方案
    setCurrentPreviewSchema(schemaWithId);
  } catch (error) {
    console.error('schemaCardRenderer error ===>', error);
    errorMessagesMap.value.set(props.cardId, error.message);
  }
};

const isStreamOperation = (operation: any) => {
  return (
    (operation.op === 'add' || operation.op === 'replace')
    && typeof operation.id === 'string' && operation.id !== ''
    && typeof operation.path === 'string' && operation.path !== ''
    && 'value' in operation
  );
};

/**
 * Applies streamed JSON Patch operations to the current schema.
 * Path resolution is formatted against the immutable pre-request
 * snapshot to avoid drift when payloads replay prior operations.
 */
const jsonPatchRenderer = async (props: any) => {
  try {
    const { content, cardId, newMessage } = props;

    if (cardId !== currentCardId.value) {
      return;
    }
    if (newMessage) {
      lastPreviewSchema.value = JSON.parse(JSON.stringify(currentPreviewSchema.value));
      // lastOperationIndex.value = -1; // TODO: 追踪已执行的index，减少重复执行，但需要把lastPreviewSchema同步更新到已操作的最新内容
    }

    const { value, state } = await textToJson(content);
    if (state !== 'successful-parse'
      && state !== 'repaired-parse' // 允许流式处理
    ) return;
    const isComplete = state === 'successful-parse';
    let lastOperationComplete = true;

    const valid = validateJsonPatch(value as any);
    if (!valid) return;

    const operations = value as any[];
    if (!isComplete) {
      const lastOperation = operations[operations.length - 1];
      if (!isStreamOperation(lastOperation)) {
        operations.pop();
        lastOperationComplete = true;
      } else {
        lastOperationComplete = false;
      }
    }
    if (operations.length === 0) {
      return;
    }

    const newOperations = formatJsonPatch(toRaw(lastPreviewSchema.value), operations);

    if (newOperations.length === 0) {
      return;
    }

    const standardOperations: JsonPatchOp[] = newOperations.map((op) => {
      const { id, idToPath, relativePath, ...standardOp } = op as any;
      return standardOp as JsonPatchOp;
    });

    // 增量 patch 需要基于“当前预览态”持续叠加，避免每个 chunk 都从已应用态重建导致丢操作。
    const patchBaseline = lastPreviewSchema.value ?? currentSchema.value;
    const targetSchema = JSON.parse(JSON.stringify(patchBaseline));
    jsonPatchFormatter.patch(targetSchema, standardOperations);
    setCurrentPreviewSchema(generateIdForComponents(targetSchema), isComplete || lastOperationComplete);
  } catch (error) {
    errorMessagesMap.value.set(props.cardId, error.message);
    console.error('jsonPatch error ===>', error);
  }
};

const getCardMessageByIndex = (index: number) => {
  return (
    (messages.value[index]?.messages as IMessageItem[] | undefined)?.find(
      (message): message is IJsonPatchMessageItem | ISchemaCardMessageItem =>
        message.type === 'schema-card' || message.type === 'json-patch',
    ) || ({} as IJsonPatchMessageItem | ISchemaCardMessageItem)
  );
};

const handleRefresh = ({ index }: { index: number }) => {
  const { messages, send } = messageManager.value;
  const cardMessage = getCardMessageByIndex(index);

  prevSchema.value = cardMessage?.prevSchema;
  let currentSchema = null;
  try {
    currentSchema = JSON.parse(prevSchema.value);
  } catch (error) {
    currentSchema = null;
  }
  if (currentSchema) {
    setCurrentSchema(currentSchema);
    setCurrentPreviewSchema(currentSchema);
  }
  messages.value = messages.value.slice(0, index);
  setCurrentCardId(messages.value[messages.value.length - 1].messageId as string);
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

const messageRenderers = {
  markdown: markdownRenderer,
  'json-patch': (props) => {
    return h(TemplateSchemaMessageRenderer, {
      itemProps: props,
      type: 'json-patch',
      prevSchema: prevSchema.value,
      errorMessagesMap: errorMessagesMap.value,
      messages: messages.value,
      onSchemaVersionToggle: (schema: Record<string, unknown>, cardId: string) =>
        emit('schema-version-toggle', schema, cardId),
    });
  },
  'schema-card': (props) => {
    return h(TemplateSchemaMessageRenderer, {
      itemProps: props,
      type: 'schema-card',
      prevSchema: prevSchema.value,
      errorMessagesMap: errorMessagesMap.value,
      messages: messages.value,
      onSchemaVersionToggle: (schema: Record<string, unknown>, cardId: string) =>
        emit('schema-version-toggle', schema, cardId),
    });
  },
};

// 当前会话的 inputMessage 代理，给 v-model 使用
const inputMessage = computed({
  get: () => messageManager.value.inputMessage.value,
  set: (v: string) => {
    messageManager.value.inputMessage.value = v;
  },
});

if (props.messages?.length) {
  messages.value.splice(0, messages.value.length, ...(props.messages as any));
}

const showMessages = computed(() => {
  let showMessages = messages.value;

  if (messageManager.value.messageState.status === STATUS.PROCESSING) {
    return [
      ...showMessages,
      {
        role: 'assistant',
        content: '正在思考中...',
        loading: true,
      },
    ];
  }

  const lastMessage = messages.value[messages.value.length - 1];

  // 在流式返回过程中，为最后一条助手消息添加 loading-text 组件
  if (generating.value && lastMessage?.role === 'assistant') {
    const existingMessages = Array.isArray((lastMessage as any)?.messages) ? (lastMessage as any).messages : [];
    // 检查是否已经存在 loading-text，避免重复添加
    const hasLoadingText = existingMessages.some((msg: any) => msg.type === 'loading-text');

    if (!hasLoadingText) {
      return [
        ...showMessages.slice(0, -1),
        {
          ...lastMessage,
          messages: [
            ...existingMessages,
            {
              type: 'loading-text',
              emitter: emitter,
              message: lastMessage,
              showThinkingResult: false,
            },
          ],
        },
      ];
    }
  }

  return showMessages;
});

const clearInputMessage = () => {
  inputMessage.value = '';
};

// 发送消息
const handleSendMessage = async () => {
  const messageContent = inputMessage.value;
  const cardId = generateId();
  setCurrentCardId(cardId);

  const userMessage: ChatMessage = {
    role: 'user',
    content: messageContent,
    messageId: cardId,
  };
  messages.value.push(userMessage);

  // 如果是第一条 user 消息，更新当前 title
  if (messages.value.length === 1 && messages.value[0].role === 'user') {
    const currentConversationId = templateConversationState.value?.currentId;
    if (currentConversationId) {
      updateTemplateTitle(currentConversationId, messageContent.substring(0, 20));
    }
  }

  prevSchema.value = JSON.stringify(currentSchema.value);
  messageManager.value.send();
  clearInputMessage();
  scrollToBottom();
};

const handleNotification = (event: INotificationPayload) => {
  if (event.type === 'done') {
    setCurrentSchema(currentPreviewSchema.value);
    // 将 schema 缓存到卡片中
    const lastMessage = messages.value[messages.value.length - 1];
    const lastMessageCard = (lastMessage as any).messages.find(
      (msg: any) => msg.type === 'schema-card' || msg.type === 'json-patch',
    );

    if (lastMessageCard) {
      lastMessageCard.schema = JSON.stringify(currentSchema.value);
      lastMessageCard.prevSchema = prevSchema.value || '';
      lastMessageCard.generatedTime = formatDate(new Date());
    }
  }
};

const messagesContainer: Ref<HTMLElement | undefined> = ref();

const { scrollToBottom, autoScrollToBottom, isLastMessageInBottom } = scrollEnd(messagesContainer);
const throttledScrollToBottom = throttle(autoScrollToBottom, 400);

watch(() => messages.value, throttledScrollToBottom, { deep: true });

onMounted(() => {
  emitter.on('notification', handleNotification);
});

onUnmounted(() => {
  emitter.off('notification', handleNotification);
});
</script>

<template>
  <div
    class="tg-chat-container"
    :class="{ 'dark': TinyGenuiConfig?.theme === 'dark' }"
  >
    <div
      class="messages-container"
      ref="messagesContainer"
    >
      <tr-bubble-provider :content-renderers="messageRenderers">
        <tr-bubble-list
          v-if="showMessages.length"
          :items="showMessages"
          :roles="roles"
          auto-scroll
        >
        </tr-bubble-list>
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
        :placeholder="
          GeneratingStatus.includes(messageManager.messageState.status) ? '正在思考中...' : '请输入您的问题～'
        "
        :clearable="true"
        :loading="GeneratingStatus.includes(messageManager.messageState.status)"
        :showWordLimit="true"
        :maxLength="5000"
        @clear="clearInputMessage"
        @submit="handleSendMessage"
        @cancel="messageManager.abortRequest"
      >
      </tr-sender>
      <div class="footer-text">内容由AI生成，仅供参考</div>
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

:deep(.tr-bubble[data-role='assistant'] .tr-bubble__content-items) {
  // 匹配：type非空 + 排除 schema-card/loading-text 这两个值
  > [type]:not([type='']):not([type='schema-card']):not([type='loading-text']) {
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
